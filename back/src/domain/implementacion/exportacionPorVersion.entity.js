/**
 * exportacionPorVersion.entity.js
 * Reglas puras de la descarga "Productos por planograma" (CU-10-06): validación del Pivote, orden
 * determinista y construcción de las hojas `Lista`, `Pivote por versión` y `Versiones` a partir de
 * las filas por versión (`construirFilasPorVersion`). Sin Express, Knex ni librerías de Excel.
 *
 * - Lista: una fila por SKU–versión–modo.
 * - Pivote: una fila por SKU–planograma–estado de la versión–modo, con bloques TG/TM/TE con los
 *   encabezados del Excel de categorías (reimportable). Una cantidad que difiere entre las
 *   posiciones del grupo se escribe `Varía` (el lector la rechaza: falla segura), nunca el primer valor.
 */

const { ORDEN_MODO } = require('../consolidado/consolidado.entity');
const { TEXTO_VARIA } = require('../consolidado/columnas');
const {
  ETIQUETA_ESTADO_TODOS, ORDEN_ESTADO, SIGLAS_BLOQUE, TIPO_POR_SIGLA, SIGLA_POR_TIPO,
  NOMBRE_HOJA_LISTA, NOMBRE_HOJA_PIVOTE, NOMBRE_HOJA_VERSIONES, MOTIVO_ESPECIAL,
  ENCABEZADOS_COMUNES_PIVOTE, ANCHOS_COMUNES_PIVOTE, ENCABEZADOS_VERSIONES, ANCHOS_VERSIONES,
  COLUMNAS_LISTA, encabezadosBloque, anchosBloque,
} = require('./columnasExportacion');

const FORMATOS_DESCARGA = Object.freeze(['LISTA', 'PIVOTE']);
const NOMBRE_ARCHIVO_POR_FORMATO = Object.freeze({ LISTA: 'lista', PIVOTE: 'pivote' });
const ETIQUETA_MODO = Object.freeze({ PLANOGRAMA: 'Planograma', CROSS: 'Cross', IMPULSO: 'Impulso' });
const SEPARADOR_ACCESORIOS = ' // ';
const COLUMNAS_COMUNES = ENCABEZADOS_COMUNES_PIVOTE.length;

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
const comparar = (a, b) => collator.compare(String(a ?? ''), String(b ?? ''));

const celdaTexto = (valor) => ({ tipo: 'texto', valor: valor ?? null });
const celdaNumero = (valor) => ({ tipo: 'numero', valor: valor === null || valor === undefined ? null : Number(valor) });
const celdaVacia = () => ({ tipo: 'texto', valor: null });
/** Número → celda numérica; cualquier otra cosa (incluido "Varía") → texto. */
const celdaPorValor = (valor) => (typeof valor === 'number' ? celdaNumero(valor) : celdaTexto(valor));

function errorPivoteNoAplicable(details) {
  const err = new Error('El Pivote no se puede generar con las versiones elegidas');
  err.status  = 422;
  err.code    = 'PIVOTE_NO_APLICABLE';
  err.details = details;
  return err;
}

// ─── Validación del Pivote ───────────────────────────────────────────────────

/**
 * Las versiones especiales de tienda (`esEspecial`) no van en el Pivote: se excluyen y se reportan.
 * Lanza 422 `PIVOTE_NO_APLICABLE` si todas son especiales, si alguna normal no tiene tipo o si dos
 * normales comparten planograma + tipo + estado.
 * @param {Array<{ versionId, codigo, tipo, estado, esEspecial, planogramaId }>} versiones
 * @returns {{ incluidas: object[], excluidas: Array<{ version: object, motivo: string }> }}
 */
function validarPivote(versiones) {
  const excluidas = versiones.filter((v) => v.esEspecial).map((version) => ({ version, motivo: MOTIVO_ESPECIAL }));
  const incluidas = versiones.filter((v) => !v.esEspecial);

  if (incluidas.length === 0) {
    throw errorPivoteNoAplicable({ sinTipo: [], duplicadas: [], soloEspeciales: true });
  }

  const sinTipo = incluidas.filter((v) => !Object.hasOwn(SIGLA_POR_TIPO, v.tipo)).map((v) => v.versionId);

  const porClave = new Map();
  incluidas.filter((v) => Object.hasOwn(SIGLA_POR_TIPO, v.tipo)).forEach((v) => {
    const clave = `${v.planogramaId}|${v.tipo}|${v.estado}`;
    if (!porClave.has(clave)) porClave.set(clave, []);
    porClave.get(clave).push(v);
  });
  const duplicadas = [...porClave.values()]
    .filter((grupo) => grupo.length > 1)
    .map((grupo) => ({
      planogramaId: grupo[0].planogramaId, tipo: grupo[0].tipo, estado: grupo[0].estado, versionIds: grupo.map((v) => v.versionId),
    }));

  if (sinTipo.length > 0 || duplicadas.length > 0) {
    throw errorPivoteNoAplicable({ sinTipo, duplicadas, soloEspeciales: false });
  }
  return { incluidas, excluidas };
}

// ─── Orden ───────────────────────────────────────────────────────────────────

/** Lista: SKU → código de versión → modo. */
function ordenarLista(filas) {
  return [...filas].sort((a, b) => comparar(a.sku, b.sku)
    || comparar(a.fila.codigoVersion, b.fila.codigoVersion)
    || ORDEN_MODO[a.fila.modo] - ORDEN_MODO[b.fila.modo]);
}

/** Pivote: SKU → nombre del planograma → estado (publicado, piloto, en desarrollo, borrador) → modo. */
function ordenarPivote(grupos) {
  return [...grupos].sort((a, b) => comparar(a.sku, b.sku)
    || comparar(a.planogramaNombre, b.planogramaNombre)
    || a.planogramaId - b.planogramaId
    || (ORDEN_ESTADO[a.estadoVersion] ?? 9) - (ORDEN_ESTADO[b.estadoVersion] ?? 9)
    || ORDEN_MODO[a.modo] - ORDEN_MODO[b.modo]);
}

// ─── Lista ───────────────────────────────────────────────────────────────────

const productoPorSku = (productos) => new Map((productos ?? []).map((p) => [String(p.sku), p]));

/** Datos del SKU con la forma que esperan las definiciones de columna del consolidado. */
function datosSku(sku, productos) {
  const p = productos.get(sku);
  return {
    sku,
    producto: { nombre: p?.nombre ?? null, marca: p?.marca ?? null, skuSustituto: p?.skuSustituto ?? null, nombreSustituto: p?.nombreSustituto ?? null },
    area: p?.area ?? null,
    departamento: p?.departamento ?? null,
  };
}

/** Une las filas de todas las versiones en una sola lista `{ sku, fila }`. */
const aplanar = (filasPorVersion) => [...filasPorVersion.values()].flat();

/**
 * @param {Map<number, Array<{ sku: string, fila: object }>>} filasPorVersion
 * @param {Array<{ sku, nombre, marca, area, departamento, skuSustituto, nombreSustituto }>} productos
 */
function construirHojaLista(filasPorVersion, productos) {
  const porSku = productoPorSku(productos);
  return {
    nombre: NOMBRE_HOJA_LISTA,
    encabezados: COLUMNAS_LISTA.map((c) => c.etiqueta),
    filas: ordenarLista(aplanar(filasPorVersion)).map(({ sku, fila }) => {
      const grupo = datosSku(sku, porSku);
      return COLUMNAS_LISTA.map((c) => celdaPorValor(c.valor(fila, grupo)));
    }),
    anchos: COLUMNAS_LISTA.map((c) => c.ancho),
    congelarFilas: 1,
  };
}

// ─── Pivote ──────────────────────────────────────────────────────────────────

/** Ganchos de la fila en orden de ubicación: un valor por gancho (número o texto `54E`). */
const ganchosDeFila = (fila) => fila.ubicaciones.flatMap((u) => u.ganchos ?? []);

/** Agrupa por SKU–planograma–estado–modo (solo versiones incluidas con tipo conocido). */
function agruparPivote(filasPorVersion, versionesIncluidas) {
  const ids = new Set(versionesIncluidas.map((v) => v.versionId));
  const grupos = new Map();
  filasPorVersion.forEach((filas, versionId) => {
    if (!ids.has(versionId)) return;
    filas.forEach(({ sku, fila }) => {
      const sigla = SIGLA_POR_TIPO[fila.tipoVersion];
      if (!sigla) return;
      const clave = `${sku}|${fila.planogramaId}|${fila.estadoVersion}|${fila.modo}`;
      if (!grupos.has(clave)) {
        grupos.set(clave, {
          sku, planogramaId: fila.planogramaId, planogramaNombre: fila.planogramaNombre,
          estadoVersion: fila.estadoVersion, modo: fila.modo, bloques: {},
        });
      }
      grupos.get(clave).bloques[sigla] = fila;
    });
  });
  return [...grupos.values()];
}

const valorONulo = (v) => (v === null || v === undefined ? null : v);
const textoVaria = (varia, valor) => (varia ? TEXTO_VARIA : valorONulo(valor));

function textoAccesorios(fila) {
  const codigos = [...new Set(fila.accesorios.map((a) => a.codigo))];
  return codigos.length ? codigos.join(SEPARADOR_ACCESORIOS) : null;
}

/** Tamaños `22"` si todos los accesorios lo tienen; vacío si ninguno; `Varía` si unos sí y otros no. */
function textoTamanos(fila) {
  const tamanos = fila.accesorios.map((a) => a.tamanoPulgadas);
  const con = tamanos.filter((t) => t !== null && t !== undefined);
  if (con.length === 0) return null;
  if (con.length < tamanos.length) return TEXTO_VARIA;
  return con.map((t) => `${t}"`).join(SEPARADOR_ACCESORIOS);
}

/** Las 13 celdas de campo de un bloque + `nGanchos` columnas de gancho (vacío si no hay fila). */
function celdasBloque(fila, nGanchos) {
  if (!fila) return Array.from({ length: 13 + nGanchos }, celdaVacia);
  const v = fila.variaciones;
  const ganchos = ganchosDeFila(fila);
  return [
    celdaTexto(fila.codigoVersion),
    celdaNumero(fila.facings),
    celdaPorValor(textoVaria(v.capacidadFacing, fila.capacidadFacing)),
    celdaPorValor(textoVaria(v.cantidadApilable, fila.cantidadApilable)),
    celdaPorValor(textoVaria(v.minEstetico, fila.minEstetico)),
    celdaNumero(fila.capacidadMaxima),
    celdaTexto(textoAccesorios(fila)),
    celdaTexto(textoTamanos(fila)),
    celdaTexto(textoVaria(v.perfil, fila.perfil)),
    celdaPorValor(fila.minVaria ? TEXTO_VARIA : valorONulo(fila.minFinal)),
    celdaPorValor(fila.maxVaria ? TEXTO_VARIA : valorONulo(fila.maxFinal)),
    celdaTexto(textoVaria(v.decision, fila.decision)),
    celdaTexto(fila.observaciones),
    ...Array.from({ length: nGanchos }, (_, i) => (ganchos[i] === undefined ? celdaVacia() : celdaPorValor(ganchos[i]))),
  ];
}

/**
 * @param {Map<number, Array<{ sku, fila }>>} filasPorVersion
 * @param {object[]} versionesIncluidas  salida de `validarPivote().incluidas`
 * @param {object[]} productos
 */
function construirHojaPivote(filasPorVersion, versionesIncluidas, productos) {
  const porSku = productoPorSku(productos);
  const grupos = ordenarPivote(agruparPivote(filasPorVersion, versionesIncluidas));

  // n = máximo de ganchos de una fila en cada bloque (0 columnas si ningún SKU tiene ganchos).
  const nGanchos = Object.fromEntries(SIGLAS_BLOQUE.map((s) => [
    s, grupos.reduce((max, g) => Math.max(max, g.bloques[s] ? ganchosDeFila(g.bloques[s]).length : 0), 0),
  ]));

  const encabezados = [...ENCABEZADOS_COMUNES_PIVOTE];
  const anchos = [...ANCHOS_COMUNES_PIVOTE];
  const titulos = [];
  SIGLAS_BLOQUE.forEach((sigla) => {
    const desde = encabezados.length;
    encabezados.push(...encabezadosBloque(sigla, nGanchos[sigla]));
    anchos.push(...anchosBloque(nGanchos[sigla]));
    titulos.push({ titulo: sigla, desde, hasta: encabezados.length - 1 });
  });

  const filas = grupos.map((g) => {
    const datos = datosSku(g.sku, porSku);
    return [
      celdaTexto(g.sku),
      celdaTexto(datos.producto.nombre),
      celdaTexto(g.planogramaNombre),
      celdaTexto(ETIQUETA_ESTADO_TODOS[g.estadoVersion] ?? g.estadoVersion),
      celdaTexto(ETIQUETA_MODO[g.modo] ?? g.modo),
      celdaTexto(datos.producto.skuSustituto),
      ...SIGLAS_BLOQUE.flatMap((s) => celdasBloque(g.bloques[s], nGanchos[s])),
    ];
  });

  return {
    nombre: NOMBRE_HOJA_PIVOTE,
    grupos: titulos,
    encabezados,
    filas,
    anchos,
    congelarFilas: 2,
    congelarColumnas: COLUMNAS_COMUNES,
  };
}

// ─── Hoja Versiones ──────────────────────────────────────────────────────────

/**
 * Cada versión elegida con su inclusión. `excluidas` viene de `validarPivote` (vacío en la Lista).
 * @param {object[]} versiones  todas las elegidas
 * @param {Array<{ version: object, motivo: string }>} excluidas
 */
function construirHojaVersiones(versiones, excluidas = []) {
  const motivoPorId = new Map(excluidas.map((e) => [e.version.versionId, e.motivo]));
  return {
    nombre: NOMBRE_HOJA_VERSIONES,
    encabezados: [...ENCABEZADOS_VERSIONES],
    filas: [...versiones].sort((a, b) => comparar(a.codigo, b.codigo) || a.versionId - b.versionId).map((v) => [
      celdaNumero(v.versionId),
      celdaTexto(v.codigo),
      celdaTexto(v.planogramaNombre),
      celdaTexto(SIGLA_POR_TIPO[v.tipo] ?? null),
      celdaTexto(ETIQUETA_ESTADO_TODOS[v.estado] ?? v.estado),
      celdaTexto(v.esEspecial ? 'Sí' : 'No'),
      celdaTexto(motivoPorId.has(v.versionId) ? 'No' : 'Sí'),
      celdaTexto(motivoPorId.get(v.versionId) ?? null),
    ]),
    anchos: [...ANCHOS_VERSIONES],
    congelarFilas: 1,
  };
}

// ─── Conteo y nombre de archivo ──────────────────────────────────────────────

/** Filas de datos de la hoja principal (tope de exportación), antes de construir celdas. */
function contarFilas(formato, filasPorVersion, versionesIncluidas) {
  if (formato === 'PIVOTE') return agruparPivote(filasPorVersion, versionesIncluidas).length;
  return aplanar(filasPorVersion).length;
}

const dos = (n) => String(n).padStart(2, '0');

/** `productos-por-planograma-{lista|pivote}-AAAAMMDD.xlsx`: solo el formato enumerado y la fecha. */
function nombreArchivo(formato, fecha) {
  if (!Object.hasOwn(NOMBRE_ARCHIVO_POR_FORMATO, formato)) throw new Error('Formato de descarga no válido');
  const compacta = `${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}`;
  return `productos-por-planograma-${NOMBRE_ARCHIVO_POR_FORMATO[formato]}-${compacta}.xlsx`;
}

module.exports = {
  FORMATOS_DESCARGA,
  validarPivote,
  ordenarLista,
  ordenarPivote,
  construirHojaLista,
  construirHojaPivote,
  construirHojaVersiones,
  contarFilas,
  nombreArchivo,
};
