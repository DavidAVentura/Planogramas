/**
 * consolidado.usecases.js
 * Casos de uso del Consolidado Tiendas (CU-10-03 listado, CU-10-04 descarga). Reciben el
 * repositorio, el catálogo (CATI) y el generador del libro por inyección. Ver
 * Arquitectura/Contratos/21_consolidado/.
 */

const { nivelJerarquiaMasEspecifico } = require('../producto/producto.entity');
const {
  construirFilasPorVersion, expandirPorTienda, contarPlanogramasPorGrupo, aplicarFiltros,
  calcularResumen, unidadesDeVista, ordenar, paginar, contarFilasExportacion, construirHojas,
} = require('./consolidado.entity');
const { errorExportacionDemasiadoGrande, errorExportacionEnCurso } = require('../compartido/erroresExportacion');

/**
 * Jerarquía (CATI) → base → tubería → filtros. Con jerarquía, CATI se resuelve ANTES de cargar la
 * base: si falla, el error se propaga (503) sin datos parciales. Sin jerarquía no se llama a CATI.
 */
async function obtenerGruposFiltrados({ repo, catalogo }, filtros) {
  const jerarquia = nivelJerarquiaMasEspecifico(filtros);
  const skusJerarquia = jerarquia
    ? new Set((await catalogo.listarSkusPorJerarquia(jerarquia.nivel, jerarquia.id)).map(String))
    : null;

  const base = await repo.cargarBase({ tiendaIds: filtros.tiendaIds ?? [] });
  const grupos = contarPlanogramasPorGrupo(expandirPorTienda(construirFilasPorVersion(base), base));

  return aplicarFiltros(grupos, {
    tiendaIds:      filtros.tiendaIds,
    versionIds:     filtros.versionIds,
    estados:        filtros.estados,
    skusJerarquia,
    busqueda:       filtros.busqueda,
    soloDuplicados: filtros.soloDuplicados,
  });
}

/**
 * Listado paginado del consolidado (vista PLANOGRAMA por grupo SKU–tienda; CROSS/IMPULSO por fila).
 * @returns {Promise<{ data, total, page, pageSize, resumen }>}
 */
async function listarConsolidado({ repo, catalogo, maximoExportacion }, filtros, { vista, page, pageSize, orden, direccion }) {
  const grupos = await obtenerGruposFiltrados({ repo, catalogo }, filtros);
  const pagina = paginar(ordenar(unidadesDeVista(grupos, vista), orden, direccion), page, pageSize);
  return { ...pagina, resumen: calcularResumen(grupos, maximoExportacion) };
}

async function obtenerFiltros({ repo }) {
  return repo.filtrosDisponibles();
}

/**
 * Genera el .xlsx. Orden: tope de filas (422) → semáforo (503) → construir hojas → escribir libro.
 * @returns {Promise<{ buffer: Buffer, filas: number }>}
 */
async function exportarConsolidado({ repo, catalogo, escribirLibro, semaforo, maximoFilas }, filtros, { formato, hojas, columnas }) {
  const grupos = await obtenerGruposFiltrados({ repo, catalogo }, filtros);
  const filas = contarFilasExportacion(grupos, formato, hojas);
  if (filas > maximoFilas) throw errorExportacionDemasiadoGrande(filas, maximoFilas);

  if (!semaforo.intentarTomar()) throw errorExportacionEnCurso();
  try {
    const buffer = await escribirLibro(construirHojas(grupos, formato, hojas ?? [], columnas));
    return { buffer, filas };
  } finally {
    semaforo.liberar();
  }
}

module.exports = { listarConsolidado, obtenerFiltros, exportarConsolidado };
