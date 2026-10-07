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

const { recorrerVersion } = require('../skuVersion/skuVersion.entity');

const {
  UMBRAL_IMPLEMENTABLE,
  ADVERTENCIA_INVENTARIO_NO_DISPONIBLE,
  ADVERTENCIA_INVENTARIO_DESACTUALIZADO,
  errorTiendaNoEncontrada,
  errorVersionNoAsignada,
  errorVersionNoEncontrada,
  ESTADOS_VERSION_IMPLEMENTACION,
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

/** Números de gancho por posición de cada versión — mismo recorrido que la vista de SKU. */
async function ganchosPorPosicion(skuRepo, versionIds) {
  const mapa = new Map();
  if (!skuRepo) return mapa;
  for (const versionId of versionIds) {
    recorrerVersion(await skuRepo.cargarVersion(versionId)).forEach((r) => mapa.set(r.posicion.id, r.ganchos));
  }
  return mapa;
}

/**
 * Filas de la tabla de productos (una por posición con sku) de las versiones, con sus ganchos y el
 * inventario del SKU en la tienda (`null` si no hay tienda o el inventario no está disponible).
 * `consultar(skus)` resuelve el inventario con los SKUs de las filas. Compartido por la vista del Implementador y la vista Por versión del Analista.
 */
async function armarFilasProductos(repo, skuRepo, versionIds, consultar) {
  const filas    = versionIds.length > 0 ? await repo.listarPosicionesConProducto(versionIds) : [];
  const consulta = await consultar([...new Set(filas.map((f) => f.sku))]);
  const ganchos  = await ganchosPorPosicion(skuRepo, versionIds);

  const data = filas.map((f) => {
    const unidades = consulta.inventario ? unidadesEnTienda(consulta.inventario, f.sku) : null;
    return {
      ...f,
      ganchos: ganchos.get(f.posicionId) ?? [],
      inventario: unidades,
      conInventario: unidades === null ? null : unidades > 0,
    };
  });
  return { data, consulta };
}

/**
 * Productos del Implementador: una fila por posición (con sku) de las versiones pedidas, con el
 * inventario del SKU en la tienda.
 * @param {object} repo
 * @param {{ obtenerInventarioTienda: Function }} inventarioPort
 * @param {number} tiendaId
 * @param {number[]} [versionIds]  sin él, todas las versiones asignadas
 * @param {{ cargarVersion: Function }} [skuRepo]  para los números de gancho (guardados o calculados)
 * @returns {Promise<object>}
 */
async function obtenerProductosImplementacion(repo, inventarioPort, tiendaId, versionIds, skuRepo) {
  const tienda    = await obtenerTiendaActivaOFallar(repo, tiendaId);
  const versiones = await obtenerVersionesAsignadasOFallar(repo, tiendaId, versionIds);

  const { data, consulta } = await armarFilasProductos(
    repo, skuRepo, versiones.map((v) => v.versionId),
    (skus) => consultarInventario(inventarioPort, tienda.codigo, skus),
  );

  return {
    tienda: datosTienda(tienda),
    ...marcaDisponibilidad(consulta),
    total: data.length,
    data,
  };
}

// ─── Vista Por versión (Analista) ────────────────────────────────────────────

/**
 * Versiones elegibles en Por versión: las publicadas y en piloto de todos los planogramas, más las
 * de `incluirIds` (llegan por enlace, pueden estar en cualquier estado). Cada una con su conteo de
 * productos ACTIVO, sus adjuntos y las tiendas que la montan. Sin inventario.
 * @param {object} repo
 * @param {number[]} [incluirIds]
 * @returns {Promise<{ data: object[] }>}
 */
async function listarVersionesPorVersion(repo, incluirIds = []) {
  const versiones = await repo.listarVersiones({ estados: ESTADOS_VERSION_IMPLEMENTACION, incluirIds });
  const ids = versiones.map((v) => v.versionId);

  const [skusFilas, adjuntosPorVersion, tiendasPorVersion] = await Promise.all([
    repo.listarSkusActivosPorVersion(ids),
    repo.contarAdjuntosPorVersion(ids),
    repo.listarTiendasPorVersion(ids),
  ]);
  const skusPorVersion = agruparPorVersion(skusFilas);

  return {
    data: versiones.map((v) => ({
      ...v,
      totalProductos: (skusPorVersion.get(v.versionId) ?? []).length,
      adjuntos:       adjuntosPorVersion.get(v.versionId) ?? 0,
      tiendaIds:      tiendasPorVersion.get(v.versionId) ?? [],
    })),
  };
}

/**
 * Productos de la vista Por versión (Analista): una fila por posición de las versiones pedidas,
 * de cualquier estado y sin validar a qué tiendas están asignadas. La tienda es opcional y solo
 * agrega inventario: con ella, cada versión trae además su resumen de inventario, su evidencia en
 * la tienda y si la tienda la monta (`montadaEnTienda`).
 * @param {object} repo
 * @param {{ obtenerInventarioTienda: Function }} inventarioPort
 * @param {{ versionIds: number[], tiendaId?: number }} filtro
 * @param {{ cargarVersion: Function }} [skuRepo]
 * @returns {Promise<object>}
 */
async function obtenerProductosPorVersion(repo, inventarioPort, { versionIds, tiendaId }, skuRepo) {
  const tienda    = tiendaId ? await obtenerTiendaActivaOFallar(repo, tiendaId) : null;
  const versiones = await repo.listarVersiones({ estados: [], incluirIds: versionIds });

  const encontradas = new Set(versiones.map((v) => v.versionId));
  const faltantes   = versionIds.filter((id) => !encontradas.has(id));
  if (faltantes.length > 0) throw errorVersionNoEncontrada(faltantes);

  const [skusFilas, adjuntosPorVersion, tiendasPorVersion, gondolas] = await Promise.all([
    repo.listarSkusActivosPorVersion(versionIds),
    repo.contarAdjuntosPorVersion(versionIds),
    repo.listarTiendasPorVersion(versionIds),
    tienda ? repo.listarGondolasConEvidencias(tienda.id, versionIds) : Promise.resolve([]),
  ]);
  const skusPorVersion     = agruparPorVersion(skusFilas);
  const gondolasPorVersion = agruparPorVersion(gondolas);

  // Sin tienda no se consulta CATI: las columnas de inventario van en null sin ser "modo degradado".
  const sinInventario = { disponible: true, inventario: null, actualizadoEn: null, desactualizado: false };
  const { data, consulta } = await armarFilasProductos(
    repo, skuRepo, versionIds,
    (skus) => (tienda ? consultarInventario(inventarioPort, tienda.codigo, skus) : Promise.resolve(sinInventario)),
  );

  const resumenVersiones = versiones.map((v) => {
    const skus        = (skusPorVersion.get(v.versionId) ?? []).map((f) => f.sku);
    const gondolasVer = gondolasPorVersion.get(v.versionId) ?? [];
    return {
      ...v,
      ...resumirInventarioVersion(skus, consulta.inventario),
      adjuntos:       adjuntosPorVersion.get(v.versionId) ?? 0,
      evidencias:     gondolasVer.reduce((total, g) => total + g.evidencias, 0),
      gondolas:       gondolasVer.map((g) => ({ id: g.id, nombre: g.nombre, orden: g.orden, evidencias: g.evidencias })),
      montadaEnTienda: tienda ? (tiendasPorVersion.get(v.versionId) ?? []).includes(tienda.id) : null,
    };
  });

  return {
    tienda: tienda ? datosTienda(tienda) : null,
    umbralImplementable: UMBRAL_IMPLEMENTABLE,
    ...marcaDisponibilidad(consulta),
    versiones: resumenVersiones,
    total: data.length,
    data,
  };
}

module.exports = {
  obtenerTiendaActivaOFallar,
  obtenerVersionesAsignadasOFallar,
  obtenerResumenImplementacion,
  obtenerProductosImplementacion,
  listarVersionesPorVersion,
  obtenerProductosPorVersion,
};
