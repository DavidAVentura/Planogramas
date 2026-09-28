/**
 * implementacion.usecases.js
 * Casos de uso de la vista del Implementador (Arquitectura/Contratos/16_implementacion/).
 * Reciben por inyección el repositorio y el puerto de inventario
 * (`obtenerInventarioTienda(codigoTienda, skus) → { inventario, actualizadoEn, desactualizado }`)
 * — sin imports de infraestructura. Si el inventario falla sin dato previo (CATI caído, timeout,
 * 5xx) se responde en modo degradado: inventarioDisponible=false, advertencia y campos de
 * inventario en null. Si se sirvió el último dato en caché: inventarioDesactualizado=true y
 * advertencia.
 */

const {
  UMBRAL_IMPLEMENTABLE,
  ADVERTENCIA_INVENTARIO_NO_DISPONIBLE,
  ADVERTENCIA_INVENTARIO_DESACTUALIZADO,
  errorTiendaNoEncontrada,
  errorVersionNoAsignada,
  resumirInventarioVersion,
  unidadesEnTienda,
} = require('./implementacion.entity');
const { ESTADOS: ESTADOS_TIENDA } = require('../tienda/tienda.entity');

// ─── Helpers compartidos (también los usa domain/evidencia) ──────────────────

/**
 * Retorna la tienda activa o lanza 404 NOT_FOUND (no existe o está inactiva).
 * @param {object} repo  repositorio de implementación
 * @param {number} tiendaId
 * @returns {Promise<object>}
 */
async function obtenerTiendaActivaOFallar(repo, tiendaId) {
  const tienda = await repo.buscarTienda(tiendaId);
  if (!tienda || tienda.estado !== ESTADOS_TIENDA.ACTIVO) throw errorTiendaNoEncontrada();
  return tienda;
}

/**
 * Retorna las versiones asignadas (publicado/piloto) pedidas; si `versionIds` no viene, todas.
 * Lanza 404 NOT_FOUND (details.versionIds) con los ids que no correspondan a la tienda.
 * @param {object} repo
 * @param {number} tiendaId
 * @param {number[]} [versionIds]
 * @returns {Promise<object[]>}
 */
async function obtenerVersionesAsignadasOFallar(repo, tiendaId, versionIds) {
  const asignadas = await repo.listarVersionesAsignadas(tiendaId);
  if (!versionIds) return asignadas;

  const idsAsignados = new Set(asignadas.map((v) => v.versionId));
  const faltantes    = versionIds.filter((id) => !idsAsignados.has(id));
  if (faltantes.length > 0) throw errorVersionNoAsignada(faltantes);

  const pedidos = new Set(versionIds);
  return asignadas.filter((v) => pedidos.has(v.versionId));
}

// ─── Helpers privados ────────────────────────────────────────────────────────

function datosTienda(tienda) {
  return { id: tienda.id, codigo: tienda.codigo, nombre: tienda.nombre, tipo: tienda.tipo };
}

/**
 * Consulta el inventario una sola vez para todos los SKUs. Nunca lanza: si el puerto falla,
 * devuelve `inventario: null` (modo degradado).
 */
async function consultarInventario(inventarioPort, codigoTienda, skus) {
  const sinDato = { actualizadoEn: null, desactualizado: false };
  if (skus.length === 0) return { disponible: true, inventario: new Map(), ...sinDato };
  try {
    const consulta = await inventarioPort.obtenerInventarioTienda(codigoTienda, skus);
    return { disponible: true, ...consulta };
  } catch {
    return { disponible: false, inventario: null, ...sinDato };
  }
}

function agruparPorVersion(filas) {
  const mapa = new Map();
  filas.forEach((f) => {
    if (!mapa.has(f.versionId)) mapa.set(f.versionId, []);
    mapa.get(f.versionId).push(f);
  });
  return mapa;
}

function marcaDisponibilidad({ disponible, actualizadoEn, desactualizado }) {
  let advertencia;
  if (!disponible) advertencia = ADVERTENCIA_INVENTARIO_NO_DISPONIBLE;
  else if (desactualizado) advertencia = ADVERTENCIA_INVENTARIO_DESACTUALIZADO;
  return {
    inventarioDisponible:     disponible,
    inventarioDesactualizado: desactualizado,
    inventarioActualizadoEn:  actualizadoEn ? actualizadoEn.toISOString() : null,
    ...(advertencia && { advertencia }),
  };
}

// ─── Casos de uso ────────────────────────────────────────────────────────────

/**
 * Resumen "Mi tienda": versiones asignadas a la tienda, con productos, inventario,
 * implementabilidad, adjuntos y evidencia por góndola.
 * @param {object} repo
 * @param {{ obtenerInventarioTienda: Function }} inventarioPort
 * @param {number} tiendaId
 * @returns {Promise<object>}
 */
async function obtenerResumenImplementacion(repo, inventarioPort, tiendaId) {
  const tienda    = await obtenerTiendaActivaOFallar(repo, tiendaId);
  const versiones = await repo.listarVersionesAsignadas(tiendaId);

  const base = { tienda: datosTienda(tienda), umbralImplementable: UMBRAL_IMPLEMENTABLE };
  if (versiones.length === 0) {
    return { ...base, ...marcaDisponibilidad({ disponible: true, actualizadoEn: null, desactualizado: false }), planogramas: [] };
  }

  const versionIds = versiones.map((v) => v.versionId);
  const [skusFilas, adjuntosPorVersion, gondolas] = await Promise.all([
    repo.listarSkusActivosPorVersion(versionIds),
    repo.contarAdjuntosPorVersion(versionIds),
    repo.listarGondolasConEvidencias(tiendaId, versionIds),
  ]);

  const skusPorVersion     = agruparPorVersion(skusFilas);
  const gondolasPorVersion = agruparPorVersion(gondolas);
  const todosLosSkus       = [...new Set(skusFilas.map((f) => f.sku))];

  const consulta = await consultarInventario(inventarioPort, tienda.codigo, todosLosSkus);

  const planogramas = versiones.map((v) => {
    const skus          = (skusPorVersion.get(v.versionId) ?? []).map((f) => f.sku);
    const gondolasVer   = gondolasPorVersion.get(v.versionId) ?? [];
    return {
      ...v,
      ...resumirInventarioVersion(skus, consulta.inventario),
      adjuntos:   adjuntosPorVersion.get(v.versionId) ?? 0,
      evidencias: gondolasVer.reduce((total, g) => total + g.evidencias, 0),
      gondolas:   gondolasVer.map((g) => ({ id: g.id, nombre: g.nombre, orden: g.orden, evidencias: g.evidencias })),
    };
  });

  return { ...base, ...marcaDisponibilidad(consulta), planogramas };
}

/**
 * Productos del Implementador: una fila por posición (con sku) de las versiones pedidas, con el
 * inventario del SKU en la tienda.
 * @param {object} repo
 * @param {{ obtenerInventarioTienda: Function }} inventarioPort
 * @param {number} tiendaId
 * @param {number[]} [versionIds]  sin él, todas las versiones asignadas
 * @returns {Promise<object>}
 */
async function obtenerProductosImplementacion(repo, inventarioPort, tiendaId, versionIds) {
  const tienda    = await obtenerTiendaActivaOFallar(repo, tiendaId);
  const versiones = await obtenerVersionesAsignadasOFallar(repo, tiendaId, versionIds);

  const filas = versiones.length > 0
    ? await repo.listarPosicionesConProducto(versiones.map((v) => v.versionId))
    : [];

  const consulta = await consultarInventario(
    inventarioPort, tienda.codigo, [...new Set(filas.map((f) => f.sku))],
  );

  const data = filas.map((f) => {
    const inventario = consulta.inventario ? unidadesEnTienda(consulta.inventario, f.sku) : null;
    return {
      ...f,
      inventario,
      conInventario: inventario === null ? null : inventario > 0,
    };
  });

  return {
    tienda: datosTienda(tienda),
    ...marcaDisponibilidad(consulta),
    total: data.length,
    data,
  };
}

module.exports = {
  obtenerTiendaActivaOFallar,
  obtenerVersionesAsignadasOFallar,
  obtenerResumenImplementacion,
  obtenerProductosImplementacion,
};
