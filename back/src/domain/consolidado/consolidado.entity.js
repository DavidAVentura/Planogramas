/**
 * consolidado.entity.js
 * Reglas de negocio puras del Consolidado Tiendas (módulo 21): combinaciones SKU–tienda–versión de
 * lo que cada tienda monta (versiones publicadas y piloto asignadas). Sin Express ni Knex.
 *
 * Tubería: base cargada en bloque → filas por versión (una por versión–SKU–modo, con las
 * ubicaciones sumadas) → grupos SKU–tienda → conteo de planogramas → filtros → resumen / vista /
 * orden / página. `planogramasEnTienda` se cuenta ANTES de filtrar: el rojo no depende de los filtros.
 */

const { recorrerVersion, valorComun } = require('../skuVersion/skuVersion.entity');
const { ESTADOS_MONTABLES } = require('../asignacion/asignacion.entity');
const { COLUMNAS_CONSOLIDADO, etiquetaColumna, TEXTO_VARIA } = require('./columnas');

const MODOS = Object.freeze(['PLANOGRAMA', 'CROSS', 'IMPULSO']);
const MODO_PENDIENTE = 'PENDIENTE';
const ORDEN_MODO = Object.freeze({ PLANOGRAMA: 0, CROSS: 1, IMPULSO: 2 });
const FORMATOS = Object.freeze(['DETALLADO', 'AGREGADO', 'HOJAS']);
const NOMBRE_HOJA_POR_MODO = Object.freeze({ PLANOGRAMA: 'Planograma', CROSS: 'Cross', IMPULSO: 'Impulso' });
const NOMBRE_HOJA_DETALLADO = 'Consolidado';
const NOMBRE_HOJA_AGREGADO = 'Min-Max agregado';
const SEPARADOR_AGREGADO = ' | ';
const SEPARADOR_OBSERVACIONES = ' · ';

/** Columnas que salen del grupo SKU–tienda y no de la fila de planograma. */
const COLUMNAS_DE_GRUPO = Object.freeze(['sku', 'producto', 'tienda', 'sustituto']);

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' });
const comparar = (a, b) => collator.compare(String(a ?? ''), String(b ?? ''));

/** Minúsculas y sin diacríticos, para buscar sin distinguir acentos. */
function normalizarTexto(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// ─── Filas por versión ───────────────────────────────────────────────────────

function agruparPor(lista, clave) {
  const mapa = new Map();
  lista.forEach((item) => {
    const k = clave(item);
    if (!mapa.has(k)) mapa.set(k, []);
    mapa.get(k).push(item);
  });
  return mapa;
}

/** Valor de texto común a todas las ubicaciones, o `null` si varían. */
function textoComun(valores) {
  const distintos = new Set(valores.map((v) => v ?? null));
  return distintos.size === 1 ? [...distintos][0] : null;
}

function unirDistintos(valores, separador) {
  const utiles = [...new Set(valores.filter((v) => v !== null && v !== undefined && String(v).trim() !== ''))];
  return utiles.length ? utiles.join(separador) : null;
}

/** Fila agregada (versión–SKU–modo): reglas del módulo 19 aplicadas a las ubicaciones del grupo. */
function construirFila(version, modo, items, accesoriosPorPosicion) {
  const posiciones = items.map((r) => r.posicion);
  const capacidades = posiciones.map((p) => p.capacidadMaxima);
  const min = valorComun(posiciones.map((p) => p.minFinal));
  const max = valorComun(posiciones.map((p) => p.maxFinal));

  const vistos = new Set();
  const accesorios = [];
  posiciones.forEach((p) => (accesoriosPorPosicion.get(p.id) ?? []).forEach((a) => {
    const clave = `${a.codigo}|${a.tamanoPulgadas ?? ''}`;
    if (vistos.has(clave)) return;
    vistos.add(clave);
    accesorios.push({ codigo: a.codigo, tamanoPulgadas: a.tamanoPulgadas ?? null });
  }));

  return {
    versionId:        version.versionId,
    codigoVersion:    version.codigo,
    planogramaId:     version.planogramaId,
    planogramaNombre: version.planogramaNombre,
    estadoVersion:    version.estado,
    modo,
    ubicaciones: items.map((r) => ({
      posicionId: r.posicion.id,
      gondola:    r.gondola.nombre,
      porUbicar:  Boolean(r.gondola.porUbicar),
      seccion:    r.seccionIndice,
      nivel:      r.nivelIndice,
      orden:      r.posicion.ordenHorizontal,
      ganchos:    r.ganchos,
    })),
    accesorios,
    facings:          posiciones.reduce((s, p) => s + Number(p.facings), 0),
    cantidadApilable: valorComun(posiciones.map((p) => p.cantidadApilable)).valor,
    capacidadFacing:  valorComun(posiciones.map((p) => p.capacidadFacing)).valor,
    capacidadMaxima:  capacidades.some((c) => c === null || c === undefined) ? null : capacidades.reduce((s, c) => s + Number(c), 0),
    minEstetico:      valorComun(posiciones.map((p) => p.minEstetico)).valor,
    minFinal:         min.valor,
    maxFinal:         max.valor,
    minVaria:         min.varia,
    maxVaria:         max.varia,
    perfil:           textoComun(posiciones.map((p) => p.perfil)),
    decision:         textoComun(posiciones.map((p) => p.decision)),
    observaciones:    unirDistintos(posiciones.map((p) => p.observaciones), SEPARADOR_OBSERVACIONES),
    montaje: {
      colganteExterno: posiciones.some((p) => Boolean(p.crossExterno)),
      display:         posiciones.some((p) => Boolean(p.montarEnDisplay)),
      desborda:        posiciones.some((p) => Boolean(p.desbordaGondola)),
      notaDesborde:    unirDistintos(posiciones.filter((p) => p.desbordaGondola).map((p) => p.notaDesborde), SEPARADOR_OBSERVACIONES),
    },
  };
}

/**
 * Agrupa la base por versión, recorre cada una una sola vez (`recorrerVersion`) y devuelve sus
 * filas agregadas por SKU y modo. Descarta sin lanzar las posiciones huérfanas (sin nivel o
 * góndola cargados), las que no tienen SKU y las de modo PENDIENTE (estas sí participan en la
 * numeración de ganchos de `recorrerVersion`). Solo versiones montables.
 * @returns {Map<number, Array<{ sku: string, fila: object }>>}
 */
function construirFilasPorVersion(base) {
  const gondolasPorVersion = agruparPor(base.gondolas, (g) => g.versionId);
  const gondolaPorId = new Map(base.gondolas.map((g) => [g.id, g]));
  const nivelPorId = new Map(base.niveles.map((n) => [n.id, n]));
  const seccionesPorGondola = agruparPor(base.secciones, (s) => s.gondolaId);
  const nivelesPorGondola = agruparPor(base.niveles, (n) => n.gondolaId);
  const accesoriosPorPosicion = agruparPor(
    [...base.accesorios].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
    (a) => a.posicionId,
  );

  // Posiciones por versión, solo las que tienen nivel y góndola cargados.
  const posicionesPorVersion = new Map();
  base.posiciones.forEach((p) => {
    const nivel = nivelPorId.get(p.nivelId);
    const gondola = nivel ? gondolaPorId.get(nivel.gondolaId) : null;
    if (!gondola) return;
    if (!posicionesPorVersion.has(gondola.versionId)) posicionesPorVersion.set(gondola.versionId, []);
    posicionesPorVersion.get(gondola.versionId).push(p);
  });

  const resultado = new Map();
  base.versiones.forEach((version) => {
    if (!ESTADOS_MONTABLES.includes(version.estado)) return;
    const gondolas = gondolasPorVersion.get(version.versionId) ?? [];
    const recorrido = recorrerVersion({
      gondolas,
      secciones:  gondolas.flatMap((g) => seccionesPorGondola.get(g.id) ?? []),
      niveles:    gondolas.flatMap((g) => nivelesPorGondola.get(g.id) ?? []),
      posiciones: posicionesPorVersion.get(version.versionId) ?? [],
    });

    const porClave = new Map();
    recorrido.forEach((r) => {
      const { sku, modo } = r.posicion;
      if (!sku || modo === MODO_PENDIENTE || !Object.hasOwn(ORDEN_MODO, modo)) return;
      const clave = `${sku}|${modo}`;
      if (!porClave.has(clave)) porClave.set(clave, { sku: String(sku), modo, items: [] });
      porClave.get(clave).items.push(r);
    });

    resultado.set(version.versionId, [...porClave.values()].map(({ sku, modo, items }) => ({
      sku,
      fila: construirFila(version, modo, items, accesoriosPorPosicion),
    })));
  });
  return resultado;
}

// ─── Grupos SKU–tienda ───────────────────────────────────────────────────────

const porCodigoVersion = (a, b) => comparar(a.codigoVersion, b.codigoVersion) || a.versionId - b.versionId;
const porModoYVersion = (a, b) => ORDEN_MODO[a.modo] - ORDEN_MODO[b.modo] || porCodigoVersion(a, b);

/** Un grupo por SKU–tienda con las filas de todas las versiones que la tienda monta. */
function expandirPorTienda(filasPorVersion, base) {
  const tiendaPorId = new Map(base.tiendas.map((t) => [t.id, t]));
  const productoPorSku = new Map((base.productos ?? []).map((p) => [String(p.sku), p]));
  const grupos = new Map();

  base.asignaciones.forEach(({ versionId, tiendaId }) => {
    const tienda = tiendaPorId.get(tiendaId);
    const filas = filasPorVersion.get(versionId);
    if (!tienda || !filas) return;
    filas.forEach(({ sku, fila }) => {
      const clave = `${sku}|${tienda.id}`;
      if (!grupos.has(clave)) {
        const p = productoPorSku.get(sku);
        grupos.set(clave, {
          sku,
          producto: {
            nombre: p?.nombre ?? null, marca: p?.marca ?? null,
            skuSustituto: p?.skuSustituto ?? null, nombreSustituto: p?.nombreSustituto ?? null,
          },
          tienda: { id: tienda.id, codigo: tienda.codigo, nombre: tienda.nombre, tipo: tienda.tipo, marca: tienda.marca ?? null },
          planogramasEnTienda: 0,
          planograma: [],
          otras: [],
        });
      }
      const grupo = grupos.get(clave);
      (fila.modo === 'PLANOGRAMA' ? grupo.planograma : grupo.otras).push(fila);
    });
  });

  return [...grupos.values()].map((g) => {
    g.planograma.sort(porCodigoVersion);
    g.otras.sort(porModoYVersion);
    return g;
  });
}

/** Fija `planogramasEnTienda` = versiones distintas con fila PLANOGRAMA. Llamar antes de filtrar. */
function contarPlanogramasPorGrupo(grupos) {
  grupos.forEach((g) => { g.planogramasEnTienda = new Set(g.planograma.map((f) => f.versionId)).size; });
  return grupos;
}

// ─── Filtros ─────────────────────────────────────────────────────────────────

/**
 * @param {object[]} grupos
 * @param {{ tiendaIds?: number[], versionIds?: number[], estados?: string[], skusJerarquia?: Set<string>|null,
 *           busqueda?: string, soloDuplicados?: boolean }} filtros
 */
function aplicarFiltros(grupos, filtros = {}) {
  const tiendaIds = new Set(filtros.tiendaIds ?? []);
  const versionIds = new Set(filtros.versionIds ?? []);
  const estados = new Set(filtros.estados ?? []);
  const busqueda = normalizarTexto(filtros.busqueda ?? '').trim();
  const { skusJerarquia = null, soloDuplicados = false } = filtros;

  const filaPasa = (f) => (versionIds.size === 0 || versionIds.has(f.versionId))
    && (estados.size === 0 || estados.has(f.estadoVersion));

  const resultado = [];
  grupos.forEach((g) => {
    if (tiendaIds.size > 0 && !tiendaIds.has(g.tienda.id)) return;
    if (skusJerarquia && !skusJerarquia.has(g.sku)) return;
    if (soloDuplicados && g.planogramasEnTienda <= 1) return;
    if (busqueda) {
      const textos = [g.sku, g.producto.nombre, g.producto.marca].map(normalizarTexto);
      if (!textos.some((t) => t.includes(busqueda))) return;
    }
    const planograma = g.planograma.filter(filaPasa);
    const otras = g.otras.filter(filaPasa);
    if (planograma.length === 0 && otras.length === 0) return;
    resultado.push({ ...g, planograma, otras });
  });
  return resultado;
}

// ─── Resumen, vista, orden y página ──────────────────────────────────────────

function calcularResumen(grupos, maximoExportacion) {
  const conteos = { PLANOGRAMA: 0, CROSS: 0, IMPULSO: 0, AGREGADO: grupos.length };
  const skus = new Set();
  const tiendas = new Set();
  let gruposConVariosPlanogramas = 0;

  grupos.forEach((g) => {
    skus.add(g.sku);
    tiendas.add(g.tienda.id);
    if (g.planogramasEnTienda > 1) gruposConVariosPlanogramas += 1;
    conteos.PLANOGRAMA += g.planograma.length;
    g.otras.forEach((f) => { conteos[f.modo] += 1; });
  });

  return {
    filas: conteos.PLANOGRAMA + conteos.CROSS + conteos.IMPULSO,
    skus: skus.size,
    tiendas: tiendas.size,
    gruposConVariosPlanogramas,
    conteos,
    maximoExportacion,
  };
}

/** PLANOGRAMA → los grupos; CROSS/IMPULSO → un grupo por cada fila de ese modo (`planograma: []`). */
function unidadesDeVista(grupos, vista) {
  if (vista === 'PLANOGRAMA') return grupos;
  return grupos.flatMap((g) => g.otras.filter((f) => f.modo === vista).map((f) => ({ ...g, planograma: [], otras: [f] })));
}

const codigoVersionDe = (g) => (g.planograma[0] ?? g.otras[0])?.codigoVersion ?? '';

const CLAVES_ORDEN = Object.freeze({
  sku:      (g) => g.sku,
  producto: (g) => g.producto.nombre ?? '',
  tienda:   (g) => `${g.tienda.codigo} ${g.tienda.nombre}`,
  version:  codigoVersionDe,
});

/** Ordena por la clave elegida; desempate fijo SKU, código de tienda, código de versión. */
function ordenar(unidades, orden = 'sku', direccion = 'asc') {
  const clave = Object.hasOwn(CLAVES_ORDEN, orden) ? CLAVES_ORDEN[orden] : CLAVES_ORDEN.sku;
  const signo = direccion === 'desc' ? -1 : 1;
  return [...unidades].sort((a, b) => signo * comparar(clave(a), clave(b))
    || comparar(a.sku, b.sku)
    || comparar(a.tienda.codigo, b.tienda.codigo)
    || comparar(codigoVersionDe(a), codigoVersionDe(b)));
}

/** Página fuera de rango → `data: []` con el total correcto. */
function paginar(unidades, page, pageSize) {
  const inicio = (page - 1) * pageSize;
  return { data: unidades.slice(inicio, inicio + pageSize), total: unidades.length, page, pageSize };
}

// ─── Exportación ─────────────────────────────────────────────────────────────

/** Filas del archivo antes de construir celdas (tope de exportación). */
function contarFilasExportacion(grupos, formato, hojas = []) {
  if (formato === 'AGREGADO') return grupos.length;
  const { conteos, filas } = calcularResumen(grupos, 0);
  if (formato === 'HOJAS') return hojas.reduce((s, h) => s + (Object.hasOwn(ORDEN_MODO, h) ? conteos[h] : 0), 0);
  return filas;
}

/** Mín./máx. del grupo: suma por versión distinta, tomando la primera fila PLANOGRAMA → CROSS → IMPULSO. */
function sumarMinMaxAgregado(grupo) {
  const porVersion = new Map();
  [...grupo.planograma, ...grupo.otras].forEach((f) => { // ya vienen en orden PLANOGRAMA → CROSS → IMPULSO
    if (!porVersion.has(f.versionId)) porVersion.set(f.versionId, f);
  });
  let minFinal = null;
  let maxFinal = null;
  let minVaria = false;
  let maxVaria = false;
  porVersion.forEach((f) => {
    if (f.minVaria) minVaria = true;
    else if (f.minFinal !== null && f.minFinal !== undefined) minFinal = (minFinal ?? 0) + Number(f.minFinal);
    if (f.maxVaria) maxVaria = true;
    else if (f.maxFinal !== null && f.maxFinal !== undefined) maxFinal = (maxFinal ?? 0) + Number(f.maxFinal);
  });
  // Si una versión "Varía" no hay total confiable: se muestra "Varía", no una suma parcial.
  return { minFinal: minVaria ? TEXTO_VARIA : minFinal, maxFinal: maxVaria ? TEXTO_VARIA : maxFinal };
}

/**
 * Mín. estético y capacidad máxima del grupo: suma de TODAS las filas (planograma + cross + impulso).
 * A diferencia del mín./máx. final (único por SKU–versión en el módulo 19), son valores físicos de
 * cada posición, así que un cross de la misma versión ocupa posiciones propias y también suma.
 * Las filas sin valor no aportan; si ninguna tiene valor, queda vacío.
 */
function sumarFisicosAgregado(grupo) {
  const sumar = (campo) => [...grupo.planograma, ...grupo.otras].reduce((s, f) => (
    f[campo] === null || f[campo] === undefined ? s : (s ?? 0) + Number(f[campo])
  ), null);
  return { minEstetico: sumar('minEstetico'), capacidadMaxima: sumar('capacidadMaxima') };
}

/** Celda tipada por su valor: número → número; el resto (incluido "Varía") → texto. */
const celda = (valor) => ({ tipo: typeof valor === 'number' ? 'numero' : 'texto', valor });

function filaDeColumnas(columnas, fila, grupo) {
  return columnas.map((c) => celda(COLUMNAS_CONSOLIDADO[c].valor(fila, grupo)));
}

/** Celdas de la fila agregada de un grupo SKU–tienda (regla D15). */
function filaAgregada(columnas, grupo) {
  const { minFinal, maxFinal } = sumarMinMaxAgregado(grupo);
  const { minEstetico, capacidadMaxima } = sumarFisicosAgregado(grupo);
  return columnas.map((c) => {
    if (c === 'minFinal') return celda(minFinal);
    if (c === 'maxFinal') return celda(maxFinal);
    if (c === 'minEstetico') return celda(minEstetico);
    if (c === 'capacidadMaxima') return celda(capacidadMaxima);
    if (COLUMNAS_DE_GRUPO.includes(c)) return celda(COLUMNAS_CONSOLIDADO[c].valor(null, grupo));
    const valores = grupo.planograma.map((f) => COLUMNAS_CONSOLIDADO[c].valor(f, grupo)).filter((v) => v !== null);
    if (valores.length === 0) return celda(null);
    return celda(valores.length === 1 ? valores[0] : valores.join(SEPARADOR_AGREGADO));
  });
}

/**
 * Hojas del libro: `{ nombre, encabezados, filas }`. Los encabezados salen de la lista blanca;
 * en DETALLADO se antepone `modo` si falta (D2). Orden fijo: SKU, código de tienda, código de versión.
 */
function construirHojas(grupos, formato, hojas, columnas) {
  const ordenados = ordenar(grupos, 'sku', 'asc');

  if (formato === 'AGREGADO') {
    return [{
      nombre: NOMBRE_HOJA_AGREGADO,
      encabezados: columnas.map(etiquetaColumna),
      filas: ordenados.map((g) => filaAgregada(columnas, g)),
    }];
  }

  if (formato === 'HOJAS') {
    return MODOS.filter((m) => hojas.includes(m)).map((modo) => ({
      nombre: NOMBRE_HOJA_POR_MODO[modo],
      encabezados: columnas.map(etiquetaColumna),
      filas: ordenados.flatMap((g) => [...g.planograma, ...g.otras]
        .filter((f) => f.modo === modo)
        .map((f) => filaDeColumnas(columnas, f, g))),
    }));
  }

  const efectivas = columnas.includes('modo') ? columnas : ['modo', ...columnas];
  return [{
    nombre: NOMBRE_HOJA_DETALLADO,
    encabezados: efectivas.map(etiquetaColumna),
    filas: ordenados.flatMap((g) => [...g.planograma, ...g.otras].map((f) => filaDeColumnas(efectivas, f, g))),
  }];
}

module.exports = {
  MODOS,
  FORMATOS,
  normalizarTexto,
  construirFilasPorVersion,
  expandirPorTienda,
  contarPlanogramasPorGrupo,
  aplicarFiltros,
  calcularResumen,
  unidadesDeVista,
  ordenar,
  paginar,
  contarFilasExportacion,
  sumarMinMaxAgregado,
  sumarFisicosAgregado,
  construirHojas,
};
