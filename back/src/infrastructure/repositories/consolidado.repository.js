/**
 * consolidado.repository.js  (infraestructura)
 * Implementación concreta del contrato del dominio usando Knex + SQL Server.
 *
 * `cargarBase` hace 7 consultas con columnas explícitas, todas acotadas por la misma subconsulta
 * de versiones montables (publicado/piloto asignadas a una tienda activa): nunca listas de ids de
 * versión ni de posición, para no pasar el límite de 2100 parámetros. Solo `tiendaIds` (≤ 200)
 * viaja como parámetro. Se cargan TODAS las posiciones de esas versiones (también las sin SKU y las
 * PENDIENTE): la numeración de ganchos de `recorrerVersion` las necesita; el dominio las descarta.
 */

const db = require('../db/connection');
const { ESTADOS_MONTABLES } = require('../../domain/asignacion/asignacion.entity');
const { mapearGondola, mapearSeccion, mapearNivel, mapearPosicionBase } = require('./mapeadoresVersion');

const TABLA_VERSION_TIENDA = 'VersionTienda';
const TABLA_VERSION        = 'PlanogramaVersion';
const TABLA_PLANOGRAMA     = 'Planograma';
const TABLA_TIENDA         = 'Tienda';
const TABLA_GONDOLA        = 'Gondola';
const TABLA_SECCION        = 'Seccion';
const TABLA_NIVEL          = 'Nivel';
const TABLA_POSICION       = 'Posicion';
const TABLA_PRODUCTO       = 'Producto';

const ESTADO_TIENDA_ACTIVA = 'activo';
const MODO_PENDIENTE       = 'PENDIENTE';

const numero = (v) => (v === null || v === undefined ? null : Number(v));

/** Subconsulta: ids de las versiones montables asignadas a tiendas activas (opcional: a `tiendaIds`). */
function versionesMontables(tiendaIds = []) {
  const q = db(TABLA_VERSION_TIENDA)
    .join(TABLA_VERSION, `${TABLA_VERSION_TIENDA}.planograma_version_id`, `${TABLA_VERSION}.id`)
    .join(TABLA_TIENDA, `${TABLA_VERSION_TIENDA}.tienda_id`, `${TABLA_TIENDA}.id`)
    .whereIn(`${TABLA_VERSION}.estado`, ESTADOS_MONTABLES)
    .where(`${TABLA_TIENDA}.estado`, ESTADO_TIENDA_ACTIVA)
    .distinct(`${TABLA_VERSION_TIENDA}.planograma_version_id`);
  if (tiendaIds.length > 0) q.whereIn(`${TABLA_VERSION_TIENDA}.tienda_id`, tiendaIds);
  return q;
}

// ─── cargarBase ──────────────────────────────────────────────────────────────

async function cargarBase({ tiendaIds = [] } = {}) {
  const montables = () => versionesMontables(tiendaIds);

  const [versiones, asignaciones, gondolas, secciones, niveles, posiciones, accesorios] = await Promise.all([
    db(TABLA_VERSION)
      .join(TABLA_PLANOGRAMA, `${TABLA_VERSION}.planograma_id`, `${TABLA_PLANOGRAMA}.id`)
      .whereIn(`${TABLA_VERSION}.id`, montables())
      .select(
        `${TABLA_VERSION}.id as versionId`,
        `${TABLA_VERSION}.codigo as codigo`,
        `${TABLA_VERSION}.estado as estado`,
        `${TABLA_PLANOGRAMA}.id as planogramaId`,
        `${TABLA_PLANOGRAMA}.nombre as planogramaNombre`,
      ),

    db(TABLA_VERSION_TIENDA)
      .join(TABLA_VERSION, `${TABLA_VERSION_TIENDA}.planograma_version_id`, `${TABLA_VERSION}.id`)
      .join(TABLA_TIENDA, `${TABLA_VERSION_TIENDA}.tienda_id`, `${TABLA_TIENDA}.id`)
      .whereIn(`${TABLA_VERSION}.estado`, ESTADOS_MONTABLES)
      .where(`${TABLA_TIENDA}.estado`, ESTADO_TIENDA_ACTIVA)
      .modify((q) => { if (tiendaIds.length > 0) q.whereIn(`${TABLA_VERSION_TIENDA}.tienda_id`, tiendaIds); })
      .select(
        `${TABLA_VERSION_TIENDA}.planograma_version_id as versionId`,
        `${TABLA_TIENDA}.id as tiendaId`,
        `${TABLA_TIENDA}.codigo as tiendaCodigo`,
        `${TABLA_TIENDA}.nombre as tiendaNombre`,
        `${TABLA_TIENDA}.tipo as tiendaTipo`,
        `${TABLA_TIENDA}.marca as tiendaMarca`,
      ),

    db(TABLA_GONDOLA)
      .whereIn('planograma_version_id', montables())
      .select('id', 'planograma_version_id', 'nombre', 'orden', 'ancho_cm', 'alto_cm', 'por_ubicar'),

    db(TABLA_SECCION)
      .join(TABLA_GONDOLA, `${TABLA_SECCION}.gondola_id`, `${TABLA_GONDOLA}.id`)
      .whereIn(`${TABLA_GONDOLA}.planograma_version_id`, montables())
      .select(
        `${TABLA_SECCION}.id`, `${TABLA_SECCION}.gondola_id`, `${TABLA_SECCION}.padre_id`,
        `${TABLA_SECCION}.es_division`, `${TABLA_SECCION}.direccion`, `${TABLA_SECCION}.orden`, `${TABLA_SECCION}.tam_cm`,
      ),

    db(TABLA_NIVEL)
      .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
      .whereIn(`${TABLA_GONDOLA}.planograma_version_id`, montables())
      .select(`${TABLA_NIVEL}.id`, `${TABLA_NIVEL}.gondola_id`, `${TABLA_NIVEL}.seccion_id`, `${TABLA_NIVEL}.orden`),

    db(TABLA_POSICION)
      .join(TABLA_NIVEL, `${TABLA_POSICION}.nivel_id`, `${TABLA_NIVEL}.id`)
      .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
      .leftJoin(`${TABLA_PRODUCTO} as producto`, `${TABLA_POSICION}.sku`, 'producto.sku')
      .leftJoin(`${TABLA_PRODUCTO} as sustituto`, 'producto.sku_sustituto', 'sustituto.sku')
      .whereIn(`${TABLA_GONDOLA}.planograma_version_id`, montables())
      .select(
        `${TABLA_POSICION}.id`,
        `${TABLA_POSICION}.nivel_id`,
        `${TABLA_POSICION}.orden_horizontal`,
        `${TABLA_POSICION}.sku`,
        `${TABLA_POSICION}.facings_horizontal`,
        `${TABLA_POSICION}.cantidad_apilable`,
        `${TABLA_POSICION}.unidades_por_facing`,
        `${TABLA_POSICION}.capacidad_maxima`,
        `${TABLA_POSICION}.min_estetico`,
        `${TABLA_POSICION}.min_final`,
        `${TABLA_POSICION}.max_final`,
        `${TABLA_POSICION}.perfil_redondeo`,
        `${TABLA_POSICION}.modo`,
        `${TABLA_POSICION}.decision`,
        `${TABLA_POSICION}.observaciones`,
        `${TABLA_POSICION}.cross_externo`,
        `${TABLA_POSICION}.montar_en_display`,
        `${TABLA_POSICION}.desborda_gondola`,
        `${TABLA_POSICION}.nota_desborde`,
        `${TABLA_POSICION}.ganchos`,
        'producto.nombre as nombre',
        'producto.marca as marca',
        'producto.sku_sustituto as sku_sustituto',
        'sustituto.nombre as sustituto_nombre',
      ),

    db('PosicionAccesorio')
      .join('Accesorio', 'PosicionAccesorio.accesorio_id', 'Accesorio.id')
      .join(TABLA_POSICION, 'PosicionAccesorio.posicion_id', `${TABLA_POSICION}.id`)
      .join(TABLA_NIVEL, `${TABLA_POSICION}.nivel_id`, `${TABLA_NIVEL}.id`)
      .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
      .whereIn(`${TABLA_GONDOLA}.planograma_version_id`, montables())
      .select('PosicionAccesorio.posicion_id', 'PosicionAccesorio.orden', 'Accesorio.codigo', 'PosicionAccesorio.tamano_pulgadas'),
  ]);

  const tiendas = new Map();
  asignaciones.forEach((a) => {
    if (!tiendas.has(a.tiendaId)) {
      tiendas.set(a.tiendaId, { id: a.tiendaId, codigo: a.tiendaCodigo, nombre: a.tiendaNombre, tipo: a.tiendaTipo, marca: a.tiendaMarca ?? null });
    }
  });

  const productos = new Map();
  posiciones.forEach((p) => {
    if (p.sku === null || p.sku === undefined || productos.has(String(p.sku))) return;
    productos.set(String(p.sku), {
      sku: String(p.sku), nombre: p.nombre ?? null, marca: p.marca ?? null,
      skuSustituto: p.sku_sustituto ?? null, nombreSustituto: p.sustituto_nombre ?? null,
    });
  });

  return {
    versiones: versiones.map((v) => ({
      versionId: v.versionId, codigo: v.codigo, estado: v.estado, planogramaId: v.planogramaId, planogramaNombre: v.planogramaNombre,
    })),
    asignaciones: asignaciones.map((a) => ({ versionId: a.versionId, tiendaId: a.tiendaId })),
    tiendas: [...tiendas.values()],
    gondolas: gondolas.map((g) => ({ ...mapearGondola(g), versionId: g.planograma_version_id })),
    secciones: secciones.map(mapearSeccion),
    niveles: niveles.map(mapearNivel),
    posiciones: posiciones.map((p) => ({
      ...mapearPosicionBase(p),
      sku:              p.sku === null || p.sku === undefined ? null : String(p.sku),
      facings:          numero(p.facings_horizontal),
      capacidadMaxima:  numero(p.capacidad_maxima),
      minFinal:         numero(p.min_final),
      maxFinal:         numero(p.max_final),
      modo:             p.modo,
      cantidadApilable: numero(p.cantidad_apilable),
      capacidadFacing:  numero(p.unidades_por_facing),
      minEstetico:      numero(p.min_estetico),
      perfil:           p.perfil_redondeo ?? null,
      decision:         p.decision ?? null,
      observaciones:    p.observaciones ?? null,
      crossExterno:     Boolean(p.cross_externo),
      montarEnDisplay:  Boolean(p.montar_en_display),
      desbordaGondola:  Boolean(p.desborda_gondola),
      notaDesborde:     p.nota_desborde ?? null,
    })),
    accesorios: accesorios.map((a) => ({
      posicionId: a.posicion_id, orden: a.orden, codigo: a.codigo, tamanoPulgadas: numero(a.tamano_pulgadas),
    })),
    productos: [...productos.values()],
  };
}

// ─── filtrosDisponibles ──────────────────────────────────────────────────────

/** Posiciones con SKU real (no PENDIENTE) de las versiones montables, con versión y gondola. */
function posicionesConSku() {
  return db(TABLA_POSICION)
    .join(TABLA_NIVEL, `${TABLA_POSICION}.nivel_id`, `${TABLA_NIVEL}.id`)
    .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
    .whereNotNull(`${TABLA_POSICION}.sku`)
    .where(`${TABLA_POSICION}.modo`, '<>', MODO_PENDIENTE);
}

async function filtrosDisponibles() {
  const [tiendas, versiones, skusPorTienda, skusPorVersion] = await Promise.all([
    db(TABLA_TIENDA)
      .whereIn('id', db(TABLA_VERSION_TIENDA)
        .join(TABLA_VERSION, `${TABLA_VERSION_TIENDA}.planograma_version_id`, `${TABLA_VERSION}.id`)
        .whereIn(`${TABLA_VERSION}.estado`, ESTADOS_MONTABLES)
        .select(`${TABLA_VERSION_TIENDA}.tienda_id`))
      .where('estado', ESTADO_TIENDA_ACTIVA)
      .orderBy('codigo', 'asc')
      .select('id', 'codigo', 'nombre', 'tipo', 'marca'),

    db(TABLA_VERSION)
      .join(TABLA_PLANOGRAMA, `${TABLA_VERSION}.planograma_id`, `${TABLA_PLANOGRAMA}.id`)
      .whereIn(`${TABLA_VERSION}.id`, versionesMontables())
      .orderBy(`${TABLA_PLANOGRAMA}.departamento`, 'asc')
      .orderBy(`${TABLA_VERSION}.codigo`, 'asc')
      .select(
        `${TABLA_VERSION}.id as versionId`,
        `${TABLA_VERSION}.codigo as codigo`,
        `${TABLA_VERSION}.estado as estado`,
        `${TABLA_PLANOGRAMA}.nombre as nombre`,
        `${TABLA_PLANOGRAMA}.descripcion as descripcion`,
        `${TABLA_PLANOGRAMA}.departamento as departamento`,
      ),

    posicionesConSku()
      .join(TABLA_VERSION_TIENDA, `${TABLA_GONDOLA}.planograma_version_id`, `${TABLA_VERSION_TIENDA}.planograma_version_id`)
      .join(TABLA_VERSION, `${TABLA_VERSION_TIENDA}.planograma_version_id`, `${TABLA_VERSION}.id`)
      .whereIn(`${TABLA_VERSION}.estado`, ESTADOS_MONTABLES)
      .groupBy(`${TABLA_VERSION_TIENDA}.tienda_id`)
      .select(`${TABLA_VERSION_TIENDA}.tienda_id as tiendaId`)
      .countDistinct(`${TABLA_POSICION}.sku as total`),

    posicionesConSku()
      .whereIn(`${TABLA_GONDOLA}.planograma_version_id`, versionesMontables())
      .groupBy(`${TABLA_GONDOLA}.planograma_version_id`)
      .select(`${TABLA_GONDOLA}.planograma_version_id as versionId`)
      .countDistinct(`${TABLA_POSICION}.sku as total`),
  ]);

  const porTienda = new Map(skusPorTienda.map((r) => [r.tiendaId, Number(r.total)]));
  const porVersion = new Map(skusPorVersion.map((r) => [r.versionId, Number(r.total)]));

  return {
    tiendas: tiendas.map((t) => ({
      id: t.id, codigo: t.codigo, nombre: t.nombre, tipo: t.tipo, marca: t.marca ?? null, totalSkus: porTienda.get(t.id) ?? 0,
    })),
    versiones: versiones.map((v) => ({
      versionId: v.versionId, codigo: v.codigo, estado: v.estado, nombre: v.nombre,
      descripcion: v.descripcion ?? null, departamento: v.departamento, totalProductos: porVersion.get(v.versionId) ?? 0,
    })),
  };
}

module.exports = { cargarBase, filtrosDisponibles };
