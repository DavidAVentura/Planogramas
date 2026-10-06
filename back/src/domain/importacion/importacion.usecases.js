/**
 * importacion.usecases.js
 * Casos de uso de la importación de layout completo (Agente Importador de PDF).
 * Reciben los repositorios por inyección de dependencia — sin imports de infraestructura.
 */

const { validarVersionEditable } = require('../gondola/gondola.entity');
const {
  planificarCuerpo,
  validarDestinosUnicos,
  degradarSkusInexistentes,
  cruzarConPorUbicar,
  filtrarProductos,
  posicionDesdeFila,
} = require('./importacion.entity');
const { normalizarCodigo } = require('../accesorio/accesorio.entity');

/** Consultas a CATI en paralelo al validar SKUs del Excel (cada SKU nuevo puede ir a CATI). */
const CONCURRENCIA_SKUS = 6;

function errorUnprocessable(mensaje) {
  const err = new Error(mensaje);
  err.status = 422;
  err.code   = 'UNPROCESSABLE';
  return err;
}

function errorNotFound(mensaje) {
  const err = new Error(mensaje);
  err.status = 404;
  err.code   = 'NOT_FOUND';
  return err;
}

async function validarGondolasDestino(gondolaRepo, versionId, cuerpos) {
  for (const cuerpo of cuerpos.filter((c) => c.destino === 'REEMPLAZAR')) {
    const gondola = await gondolaRepo.buscarPorId(cuerpo.gondola_id);
    if (!gondola || gondola.versionId !== versionId) {
      throw errorNotFound(`Góndola ${cuerpo.gondola_id} no encontrada en la versión ${versionId}`);
    }
    if (gondola.por_ubicar) {
      throw errorUnprocessable('La góndola "Por ubicar" no se puede reemplazar con un layout; sus productos se usan para llenarlo');
    }
  }
}

async function validarAccesorios(accesorioRepo, planes) {
  const ids = new Set(planes.flatMap((p) => p.niveles.map((n) => n.codigo_accesorio_id).filter(Boolean)));
  for (const id of ids) {
    if (!(await accesorioRepo.buscarPorId(id))) throw errorNotFound(`Accesorio ${id} no encontrado`);
  }
}

/** Garantiza cada SKU en el catálogo local (nutriéndolo desde CATI); devuelve los que no existen. */
async function skusInexistentes(productoRepo, planes) {
  const skus = new Set(planes.flatMap((p) => p.niveles.flatMap((n) => n.posiciones.map((x) => x.sku).filter(Boolean))));
  const faltantes = new Set();
  for (const sku of skus) {
    if (!(await productoRepo.asegurarExistencia(sku))) faltantes.add(sku);
  }
  return faltantes;
}

/**
 * Importa uno o más cuerpos (góndolas completas con secciones, niveles y posiciones) en una
 * versión editable, en una sola transacción. Las posiciones con SKU que no existe quedan como
 * PENDIENTE con advertencia (no bloquean la importación).
 * @returns {Promise<{ gondolas: object[], advertencias: string[] }>}
 */
async function importarLayout({ importacionRepo, gondolaRepo, versionRepo, accesorioRepo, productoRepo }, versionId, datos) {
  const version = await versionRepo.buscarPorId(versionId);
  if (!version) throw errorNotFound(`Versión ${versionId} no encontrada`);
  validarVersionEditable(version.estado);

  validarDestinosUnicos(datos.cuerpos);
  await validarGondolasDestino(gondolaRepo, versionId, datos.cuerpos);

  const planes = datos.cuerpos.map(planificarCuerpo);
  await validarAccesorios(accesorioRepo, planes);

  // Los productos de "Por ubicar" (Excel) mandan sobre lo que el agente leyó del PDF.
  const cruce = datos.usar_por_ubicar
    ? cruzarConPorUbicar(planes, await importacionRepo.posicionesPorUbicar(versionId))
    : { eliminar: [], actualizar: [], llenados: 0, advertencias: [] };

  const advertencias = [...cruce.advertencias, ...degradarSkusInexistentes(planes, await skusInexistentes(productoRepo, planes))];
  const gondolas = await importacionRepo.importarCuerpos(versionId, planes, cruce);

  return { gondolas, desdePorUbicar: cruce.llenados, advertencias };
}

/** Corre `tareas` (funciones async) con a lo sumo `limite` en paralelo, conservando el orden. */
async function enParalelo(tareas, limite) {
  const resultados = new Array(tareas.length);
  let siguiente = 0;
  async function trabajador() {
    while (siguiente < tareas.length) {
      const i = siguiente++;
      resultados[i] = await tareas[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, tareas.length) }, trabajador));
  return resultados;
}

/** Garantiza el SKU en el catálogo local (nutriéndolo desde CATI) y devuelve su ancho. */
async function validarProducto(productoRepo, sku) {
  const existe = await productoRepo.asegurarExistencia(sku);
  if (!existe) return { existe: false, anchoCm: null };
  const producto = await productoRepo.buscarPorSku(sku);
  const ancho = Number(producto?.ancho_cm);
  return { existe: true, anchoCm: ancho > 0 ? ancho : null };
}

/**
 * Importa el listado de productos de un Excel de planograma a la góndola "Por ubicar" de la
 * versión (la crea si no existe): una posición por SKU con todos sus datos de montaje (ganchos,
 * cantidades, mín./máx., accesorio y su tamaño, sustitución, observaciones), 10 por nivel de
 * relleno. El analista después mueve cada producto a su lugar real en el lienzo.
 *
 * No bloquea por datos faltantes: SKUs que no existen quedan como PENDIENTE y accesorios que no
 * están en el catálogo se omiten; ambos se informan en `advertencias`.
 * @returns {Promise<{ gondola: { id, creada, totalNiveles }, totalImportados, omitidos, advertencias }>}
 */
async function importarProductos({ importacionRepo, versionRepo, accesorioRepo, productoRepo }, versionId, datos) {
  const version = await versionRepo.buscarPorId(versionId);
  if (!version) throw errorNotFound(`Versión ${versionId} no encontrada`);
  validarVersionEditable(version.estado);

  const { aImportar, omitidos } = filtrarProductos(datos.productos, await importacionRepo.skusDeVersion(versionId));
  const advertencias = [];

  const productos = await enParalelo(aImportar.map((f) => () => validarProducto(productoRepo, f.sku)), CONCURRENCIA_SKUS);

  const accesorios = new Map();
  for (const codigo of new Set(aImportar.map((f) => f.accesorio_codigo).filter(Boolean))) {
    const accesorio = await accesorioRepo.buscarPorCodigo(normalizarCodigo(codigo));
    accesorios.set(codigo, accesorio);
    if (!accesorio) advertencias.push(`El accesorio "${codigo}" no existe en el catálogo; esos productos se importaron sin accesorio.`);
  }

  const posiciones = aImportar.map((fila, i) => {
    if (!productos[i].existe) advertencias.push(`El SKU ${fila.sku} no existe en el catálogo; quedó como espacio pendiente.`);
    const accesorio = accesorios.get(fila.accesorio_codigo);
    return posicionDesdeFila(
      fila,
      productos[i],
      accesorio ? { id: accesorio.id, tamano_pulgadas: fila.tamano_accesorio_pulgadas ?? null } : null,
    );
  });

  const gondola = posiciones.length
    ? await importacionRepo.importarPorUbicar(versionId, posiciones)
    : null;

  return { gondola, totalImportados: posiciones.length, omitidos, advertencias };
}

module.exports = { importarLayout, importarProductos };
