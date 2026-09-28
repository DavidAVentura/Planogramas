/**
 * producto.repository.js  (infraestructura)
 * Acceso a la tabla local `Producto` — la fuente de verdad LOCAL que valida el backend al
 * crear una Posicion (FK real a nivel de BD, ver Posicion.sku en la migración). Es distinta
 * del catálogo de solo-lectura que expone `GET /catalog/productos/*` (proxy en vivo a CATI,
 * ver catalogo.controller.js) — CATI puede conocer un SKU real que todavía no exista acá.
 * `catalogo.controller.js` usa `buscarPorSku` para enriquecer su respuesta con
 * `sku_sustituto`/`fuente_dimensiones`/`dimensiones_validadas`.
 *
 * Todavía no existe un pipeline automático que sincronice esta tabla desde Stibo/VTEX/CATI
 * (ver REUNION_TECNICA.md) — `asegurarExistencia` cubre ese hueco de forma incremental: nutre
 * la tabla local con un producto de CATI la primera vez que alguien intenta usar su SKU.
 */

const db = require('../db/connection');
const catiClient = require('../cati/catiClient');

const { MODOS_APARICION } = require('../../domain/producto/producto.entity');

const TABLA_PRODUCTO       = 'Producto';
const TABLA_POSICION       = 'Posicion';
const TABLA_NIVEL          = 'Nivel';
const TABLA_GONDOLA        = 'Gondola';
const TABLA_VERSION        = 'PlanogramaVersion';
const TABLA_PLANOGRAMA     = 'Planograma';
const TABLA_VERSION_TIENDA = 'VersionTienda';

const ESTADO_ARCHIVADO = 'archivado';

// ─── Helpers privados ────────────────────────────────────────────────────────

function aNumero(valor) {
  return valor === null || valor === undefined ? null : Number(valor);
}

/**
 * Posiciones con SKU dentro de versiones y planogramas vigentes (no archivados), con la cadena
 * Posicion → Nivel → Gondola → PlanogramaVersion → Planograma ya unida.
 */
function consultaApariciones() {
  return db(TABLA_POSICION)
    .join(TABLA_NIVEL, `${TABLA_POSICION}.nivel_id`, `${TABLA_NIVEL}.id`)
    .join(TABLA_GONDOLA, `${TABLA_NIVEL}.gondola_id`, `${TABLA_GONDOLA}.id`)
    .join(TABLA_VERSION, `${TABLA_GONDOLA}.planograma_version_id`, `${TABLA_VERSION}.id`)
    .join(TABLA_PLANOGRAMA, `${TABLA_VERSION}.planograma_id`, `${TABLA_PLANOGRAMA}.id`)
    .whereNotNull(`${TABLA_POSICION}.sku`)
    .whereNot(`${TABLA_VERSION}.estado`, ESTADO_ARCHIVADO)
    .whereNot(`${TABLA_PLANOGRAMA}.estado`, ESTADO_ARCHIVADO);
}

function mapProductoListado(row, porModo, idsPorSku) {
  const apariciones = Object.fromEntries(MODOS_APARICION.map((modo) => [modo, porModo[`${row.sku}|${modo}`] ?? 0]));
  return {
    sku:                   row.sku,
    nombre:                row.nombre,
    marca:                 row.marca,
    categoria_nivel1:      row.categoria_nivel1,
    categoria_nivel2:      row.categoria_nivel2,
    subcategoria:          row.subcategoria,
    precio:                aNumero(row.precio),
    ancho_cm:              aNumero(row.ancho_cm),
    alto_cm:               aNumero(row.alto_cm),
    profundidad_cm:        aNumero(row.profundidad_cm),
    fuente_dimensiones:    row.fuente_dimensiones,
    dimensiones_validadas: Boolean(row.dimensiones_validadas),
    imagen_url:            row.imagen_url,
    estado:                row.estado,
    sku_sustituto:         row.sku_sustituto,
    planogramas:           idsPorSku.get(row.sku)?.length ?? 0,
    apariciones,
    planograma_ids:        idsPorSku.get(row.sku) ?? [],
  };
}

// ─── existe ──────────────────────────────────────────────────────────────────

async function existe(sku) {
  const row = await db(TABLA_PRODUCTO).where('sku', sku).select('sku').first();
  return Boolean(row);
}

// ─── crearDesdeCati ──────────────────────────────────────────────────────────

async function crearDesdeCati(datosCati) {
  await db(TABLA_PRODUCTO).insert({
    sku:                 datosCati.sku,
    nombre:              datosCati.nombre || datosCati.sku,
    marca:               datosCati.marca,
    categoria_nivel1:    datosCati.categoria_nivel1,
    categoria_nivel2:    datosCati.categoria_nivel2,
    subcategoria:        datosCati.subcategoria,
    ancho_cm:            datosCati.ancho_cm,
    alto_cm:             datosCati.alto_cm,
    profundidad_cm:      datosCati.profundidad_cm,
    fuente_dimensiones:  'CATI',
    precio:              datosCati.precio,
    imagen_url:          datosCati.imagen_url,
  });
}

// ─── buscarPorSku ────────────────────────────────────────────────────────────

async function buscarPorSku(sku) {
  const row = await db(TABLA_PRODUCTO).where('sku', sku).first();
  return row ?? null;
}

// ─── actualizarDimensiones ───────────────────────────────────────────────────

/**
 * Actualiza las dimensiones físicas del producto local. Fija fuente_dimensiones='MANUAL' y
 * dimensiones_validadas=true — el analista que corrige una medida a mano la da por válida
 * (ver Arquitectura/Contratos/08_catalogo/PATCH_productos_actualizar_dimensiones.md).
 */
async function actualizarDimensiones(sku, { ancho_cm, alto_cm, profundidad_cm }) {
  await db(TABLA_PRODUCTO).where('sku', sku).update({
    ancho_cm,
    alto_cm,
    profundidad_cm,
    fuente_dimensiones: 'MANUAL',
    dimensiones_validadas: true,
  });
  return buscarPorSku(sku);
}

// ─── marcarDimensionesValidadas ──────────────────────────────────────────────

async function marcarDimensionesValidadas(sku) {
  await db(TABLA_PRODUCTO).where('sku', sku).update({ dimensiones_validadas: true });
  return buscarPorSku(sku);
}

// ─── asegurarExistencia ──────────────────────────────────────────────────────

/**
 * Garantiza que el SKU exista en la tabla local Producto antes de usarlo en una Posicion.
 * Si ya existe localmente, no hace nada. Si no, lo busca en CATI y, si CATI lo tiene, lo
 * inserta localmente con esos datos (nutriendo el catálogo local incrementalmente).
 * @param {string} sku
 * @returns {Promise<boolean>} true si el SKU existe localmente al terminar (ya existía o se
 *   acaba de crear), false si no existe ni localmente ni en CATI.
 */
async function asegurarExistencia(sku) {
  if (await existe(sku)) return true;

  const datosCati = await catiClient.obtenerProducto(sku);
  if (!datosCati) return false;

  await crearDesdeCati(datosCati);
  return true;
}

// ─── listarConApariciones ────────────────────────────────────────────────────

/**
 * Tres consultas en vez de un solo GROUP BY con pivot: los conteos por modo y los ids de
 * planogramas (que alimentan el filtro por planograma de la vista /productos) se arman en memoria.
 * La tabla local solo tiene los SKUs que alguien ya usó en una posición, así que el volumen es
 * acotado.
 */
async function listarConApariciones() {
  const [productos, planogramasPorSku, porModo] = await Promise.all([
    db(TABLA_PRODUCTO)
      .select(
        'sku', 'nombre', 'marca', 'categoria_nivel1', 'categoria_nivel2', 'subcategoria', 'precio',
        'ancho_cm', 'alto_cm', 'profundidad_cm', 'fuente_dimensiones', 'dimensiones_validadas',
        'imagen_url', 'estado', 'sku_sustituto',
      )
      .orderBy('nombre', 'asc'),
    consultaApariciones()
      .distinct(`${TABLA_POSICION}.sku`, `${TABLA_VERSION}.planograma_id`),
    consultaApariciones()
      .whereIn(`${TABLA_POSICION}.modo`, MODOS_APARICION)
      .groupBy(`${TABLA_POSICION}.sku`, `${TABLA_POSICION}.modo`)
      .select(`${TABLA_POSICION}.sku`, `${TABLA_POSICION}.modo`)
      .countDistinct(`${TABLA_VERSION}.planograma_id as planogramas`),
  ]);

  const idsPorSku = new Map();
  planogramasPorSku.forEach((r) => {
    const ids = idsPorSku.get(r.sku);
    if (ids) ids.push(r.planograma_id);
    else idsPorSku.set(r.sku, [r.planograma_id]);
  });
  const conteoPorModo = Object.fromEntries(porModo.map((r) => [`${r.sku}|${r.modo}`, Number(r.planogramas)]));

  return productos.map((row) => mapProductoListado(row, conteoPorModo, idsPorSku));
}

// ─── listarApariciones ───────────────────────────────────────────────────────

async function listarApariciones(sku) {
  const tiendasPorVersion = db(TABLA_VERSION_TIENDA)
    .groupBy('planograma_version_id')
    .select('planograma_version_id')
    .count('tienda_id as tiendas')
    .as('tv');

  const rows = await consultaApariciones()
    .leftJoin(tiendasPorVersion, 'tv.planograma_version_id', `${TABLA_VERSION}.id`)
    .where(`${TABLA_POSICION}.sku`, sku)
    .select(
      `${TABLA_POSICION}.id as posicionId`,
      `${TABLA_POSICION}.modo`,
      `${TABLA_POSICION}.cross_externo`,
      `${TABLA_POSICION}.decision`,
      `${TABLA_PLANOGRAMA}.id as planogramaId`,
      `${TABLA_PLANOGRAMA}.nombre as planograma`,
      `${TABLA_PLANOGRAMA}.departamento`,
      `${TABLA_PLANOGRAMA}.estado as planogramaEstado`,
      `${TABLA_VERSION}.id as versionId`,
      `${TABLA_VERSION}.codigo`,
      `${TABLA_VERSION}.tipo`,
      `${TABLA_VERSION}.estado as versionEstado`,
      `${TABLA_GONDOLA}.nombre as gondola`,
      `${TABLA_NIVEL}.orden as nivel`,
      db.raw('COALESCE(tv.tiendas, 0) as tiendas'),
    )
    .orderBy([
      { column: `${TABLA_PLANOGRAMA}.nombre`, order: 'asc' },
      { column: `${TABLA_VERSION}.codigo`, order: 'asc' },
      { column: `${TABLA_GONDOLA}.orden`, order: 'asc' },
      { column: `${TABLA_NIVEL}.orden`, order: 'asc' },
    ]);

  return rows.map((r) => ({
    posicionId:       r.posicionId,
    modo:             r.modo,
    cross_externo:    Boolean(r.cross_externo),
    decision:         r.decision,
    planogramaId:     r.planogramaId,
    planograma:       r.planograma,
    departamento:     r.departamento,
    planogramaEstado: r.planogramaEstado,
    versionId:        r.versionId,
    codigo:           r.codigo,
    tipo:             r.tipo,
    versionEstado:    r.versionEstado,
    gondola:          r.gondola,
    nivel:            r.nivel,
    tiendas:          Number(r.tiendas),
  }));
}

module.exports = {
  existe,
  crearDesdeCati,
  asegurarExistencia,
  buscarPorSku,
  actualizarDimensiones,
  marcarDimensionesValidadas,
  listarConApariciones,
  listarApariciones,
};
