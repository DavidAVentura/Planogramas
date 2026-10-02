/**
 * pruebas.repository.js
 * Implementación con Knex del soporte de pruebas Postman (contrato en
 * domain/pruebas/pruebas.repository.js). Solo se usa con PRUEBAS_HABILITADAS=true.
 *
 * sembrarFixtures crea los estados que la API no puede generar (o que solo se lograban con SQL a
 * mano): productos y accesorio fixture, tres tiendas de prueba (para que la colección nunca
 * monte versiones en tiendas reales), un planograma archivado, uno con versión publicada, uno con
 * góndola/nivel/posición en borrador, una versión piloto con errores bloqueantes y una evidencia
 * subida por otro usuario.
 *
 * eliminarDatos borra los planogramas y tiendas que la corrida creó con todo lo que cuelga de
 * ellos (versiones, góndolas, adjuntos, evidencias, asignaciones y su auditoría) y los productos /
 * accesorios fixture que ya no estén referenciados.
 */

const db = require('../db/connection');

const SKU_FIXTURE                  = 'SKU-FIXTURE-GONDOLA';
const SKU_FIXTURE_SIN_DIMENSIONES  = 'SKU-FIXTURE-SIN-DIMENSIONES';
const CODIGO_ACCESORIO_FIXTURE     = 'G-12-FIXTURE';
const DEPARTAMENTO_FIXTURE         = 'Autos';
const USUARIO_OTRO                 = 'usuario-fixture-otro';
const CONTENEDOR_SIN_BLOB          = 'fixture-sin-blob'; // la evidencia fixture no tiene archivo real

// ─── sembrarFixtures ─────────────────────────────────────────────────────────

async function asegurarProducto(trx, producto) {
  const existe = await trx('Producto').where('sku', producto.sku).first('sku');
  if (!existe) await trx('Producto').insert(producto);
}

async function asegurarAccesorio(trx) {
  const existente = await trx('Accesorio').where('codigo', CODIGO_ACCESORIO_FIXTURE).first('id');
  if (existente) return existente.id;

  const [{ id }] = await trx('Accesorio').insert({
    codigo: CODIGO_ACCESORIO_FIXTURE, nombre: 'Gancho fixture 12 pulgadas', tipo: 'GANCHO', longitud_cm: 30,
  }).returning('id');
  return id;
}

async function crearTienda(trx, codigo, nombre) {
  const [{ id }] = await trx('Tienda').insert({
    codigo, nombre, tipo: 'GRANDE', estado: 'activo', region: 'Pruebas', Marca: 'Cemaco',
  }).returning('id');
  return id;
}

async function crearPlanograma(trx, nombre, estado, usuario) {
  const [{ id }] = await trx('Planograma').insert({
    nombre, departamento: DEPARTAMENTO_FIXTURE, estado, created_by: usuario,
  }).returning('id');
  await trx('PlanogramaSubcategoria').insert({ planograma_id: id, subcategoria: 'Aceites' });
  return id;
}

async function crearVersion(trx, planogramaId, estado, codigo) {
  const [{ id }] = await trx('PlanogramaVersion').insert({
    planograma_id: planogramaId, tipo: 'GRANDE', estado, codigo,
  }).returning('id');
  return id;
}

/** Góndola con un nivel de 100 cm y una posición de 10 cm del SKU fixture. */
async function crearGondolaConPosicion(trx, versionId, { minFinal = null, maxFinal = null } = {}) {
  const [{ id: gondolaId }] = await trx('Gondola').insert({
    planograma_version_id: versionId, nombre: 'Góndola fixture', ancho_cm: 120, alto_cm: 180, profundidad_cm: 40, orden: 1,
  }).returning('id');
  const [{ id: nivelId }] = await trx('Nivel').insert({
    gondola_id: gondolaId, orden: 1, altura_desde_piso_cm: 0, ancho_disponible_cm: 100,
  }).returning('id');
  await trx('Posicion').insert({
    nivel_id: nivelId, orden_horizontal: 1, sku: SKU_FIXTURE, ancho_asignado_cm: 10,
    min_final: minFinal, max_final: maxFinal,
  });
  return gondolaId;
}

async function sembrarFixtures({ sufijo, usuario }) {
  return db.transaction(async (trx) => {
    await asegurarProducto(trx, {
      sku: SKU_FIXTURE, nombre: 'Producto fixture', ancho_cm: 10, alto_cm: 20, profundidad_cm: 5,
    });
    await asegurarProducto(trx, { sku: SKU_FIXTURE_SIN_DIMENSIONES, nombre: 'Producto fixture sin dimensiones' });
    const accesorioId = await asegurarAccesorio(trx);

    const tiendaIds = [
      await crearTienda(trx, `PMF1-${sufijo}`, `Tienda fixture 1 ${sufijo}`),
      await crearTienda(trx, `PMF2-${sufijo}`, `Tienda fixture 2 ${sufijo}`),
      await crearTienda(trx, `PMF3-${sufijo}`, `Tienda fixture 3 ${sufijo}`),
    ];

    const nombreExistente = `Planograma Existente ${sufijo}`;
    const planogramaIdConPosiciones = await crearPlanograma(trx, nombreExistente, 'borrador', usuario);
    const versionIdConPosiciones    = await crearVersion(trx, planogramaIdConPosiciones, 'borrador', `FIXTURE-POSICIONES-${sufijo}`);
    const gondolaIdConPosiciones    = await crearGondolaConPosicion(trx, versionIdConPosiciones);

    const planogramaIdArchivado = await crearPlanograma(trx, `Fixture Archivado ${sufijo}`, 'archivado', usuario);

    const planogramaIdConVersionesPublicadas = await crearPlanograma(trx, `Fixture Publicado ${sufijo}`, 'activo', usuario);
    const versionIdPublicada = await crearVersion(trx, planogramaIdConVersionesPublicadas, 'publicado', `FIXTURE-PUBLICADA-${sufijo}`);
    await trx('VersionTienda').insert({ planograma_version_id: versionIdPublicada, tienda_id: tiendaIds[0] });

    const planogramaIdBloqueantes = await crearPlanograma(trx, `Fixture Errores Bloqueantes ${sufijo}`, 'activo', usuario);
    const versionIdConErroresBloqueantes = await crearVersion(trx, planogramaIdBloqueantes, 'piloto', `FIXTURE-BLOQUEANTES-${sufijo}`);
    await trx('VersionTienda').insert({ planograma_version_id: versionIdConErroresBloqueantes, tienda_id: tiendaIds[0] });
    const gondolaIdBloqueantes = await crearGondolaConPosicion(trx, versionIdConErroresBloqueantes, { minFinal: 10, maxFinal: 5 });

    const [{ id: evidenciaIdDeOtroUsuario }] = await trx('EvidenciaImplementacion').insert({
      planograma_version_id: versionIdConErroresBloqueantes,
      tienda_id:       tiendaIds[0],
      gondola_id:      gondolaIdBloqueantes,
      nombre_original: 'fixture-otro-usuario.png',
      tipo_mime:       'image/png',
      tamano_bytes:    1,
      blob_container:  CONTENEDOR_SIN_BLOB,
      blob_path:       `fixtures/${sufijo}/otro-usuario.png`,
      blob_url:        `fixture://${sufijo}/otro-usuario.png`,
      subido_por:      USUARIO_OTRO,
    }).returning('id');

    return {
      tiendaIdExistente:  tiendaIds[0],
      tiendaIdExistente2: tiendaIds[1],
      tiendaIdExistente3: tiendaIds[2],
      nombreExistente,
      departamentoExistente: DEPARTAMENTO_FIXTURE,
      planogramaIdArchivado,
      planogramaIdConVersionesPublicadas,
      versionIdConErroresBloqueantes,
      gondolaIdConPosiciones,
      skuExistente:      SKU_FIXTURE,
      skuSinDimensiones: SKU_FIXTURE_SIN_DIMENSIONES,
      accesorioIdExistente: accesorioId,
      evidenciaIdDeOtroUsuario,
      limpieza: {
        planogramaIds: [planogramaIdConPosiciones, planogramaIdArchivado, planogramaIdConVersionesPublicadas, planogramaIdBloqueantes],
        tiendaIds,
        skus:          [SKU_FIXTURE, SKU_FIXTURE_SIN_DIMENSIONES],
        accesorioIds:  [accesorioId],
      },
    };
  });
}

// ─── listarBlobs ─────────────────────────────────────────────────────────────

function versionesDe(qb, planogramaIds) {
  return qb('PlanogramaVersion').whereIn('planograma_id', planogramaIds).select('id');
}

async function listarBlobs({ planogramaIds, tiendaIds }) {
  const adjuntos = await db('Adjunto')
    .whereIn('planograma_version_id', versionesDe(db, planogramaIds))
    .select('blob_container as container', 'blob_path as blobPath');

  const evidencias = await db('EvidenciaImplementacion')
    .where((qb) => qb.whereIn('planograma_version_id', versionesDe(db, planogramaIds)).orWhereIn('tienda_id', tiendaIds))
    .whereNot('blob_container', CONTENEDOR_SIN_BLOB)
    .select('blob_container as container', 'blob_path as blobPath');

  return [...adjuntos, ...evidencias];
}

// ─── eliminarDatos ───────────────────────────────────────────────────────────

/** Borra primero las versiones derivadas (version_base_id es FK self sin cascada), hoja por hoja. */
async function eliminarVersiones(trx, planogramaIds) {
  const delPlanograma = () => trx('PlanogramaVersion').whereIn('planograma_id', planogramaIds);
  for (let borradas = 1; borradas > 0;) {
    borradas = await delPlanograma()
      .whereNotIn('id', trx('PlanogramaVersion').whereNotNull('version_base_id').select('version_base_id'))
      .del();
  }
}

async function eliminarAuditoria(trx, planogramaIds, tiendaIds) {
  const filas = () => trx('AsignacionAuditoria')
    .whereIn('planograma_id', planogramaIds)
    .orWhereIn('tienda_id', tiendaIds);

  const edicionIds = (await filas().distinct('edicion_id')).map((f) => f.edicion_id);
  await filas().del();
  if (edicionIds.length === 0) return;

  await trx('EdicionAsignacion')
    .whereIn('id', edicionIds)
    .whereNotIn('id', trx('AsignacionAuditoria').select('edicion_id'))
    .del();
}

async function eliminarProductosHuerfanos(trx, skus) {
  let total = 0;
  for (let borrados = 1; borrados > 0;) {
    borrados = await trx('Producto')
      .whereIn('sku', skus)
      .whereNotIn('sku', trx('Posicion').whereNotNull('sku').select('sku'))
      .whereNotIn('sku', trx('Producto').whereNotNull('sku_sustituto').select('sku_sustituto'))
      .del();
    total += borrados;
  }
  return total;
}

async function eliminarAccesoriosHuerfanos(trx, accesorioIds) {
  return trx('Accesorio')
    .whereIn('id', accesorioIds)
    .whereNotIn('id', trx('PosicionAccesorio').select('accesorio_id'))
    .whereNotIn('id', trx('Nivel').whereNotNull('codigo_accesorio_id').select('codigo_accesorio_id'))
    .del();
}

async function eliminarDatos({ planogramaIds, tiendaIds, skus, accesorioIds }) {
  return db.transaction(async (trx) => {
    await trx('EvidenciaImplementacion')
      .whereIn('planograma_version_id', versionesDe(trx, planogramaIds))
      .orWhereIn('tienda_id', tiendaIds)
      .del();
    await eliminarAuditoria(trx, planogramaIds, tiendaIds);
    await eliminarVersiones(trx, planogramaIds);

    const planogramas = await trx('Planograma').whereIn('id', planogramaIds).del();
    const tiendas     = await trx('Tienda').whereIn('id', tiendaIds).del();
    const productos   = await eliminarProductosHuerfanos(trx, skus);
    const accesorios  = await eliminarAccesoriosHuerfanos(trx, accesorioIds);

    return { planogramas, tiendas, productos, accesorios };
  });
}

module.exports = {
  sembrarFixtures,
  listarBlobs,
  eliminarDatos,
};
