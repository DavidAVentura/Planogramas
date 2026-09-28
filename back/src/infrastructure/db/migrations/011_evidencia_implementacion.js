/**
 * 011_evidencia_implementacion.js
 * Agrega la tabla EvidenciaImplementacion — fotos que el Implementador sube de cada góndola ya
 * montada en su tienda (ver Arquitectura/Contratos/17_evidencias/). Se asocian a
 * versión + tienda + góndola: la misma versión montada en varias tiendas tiene evidencia propia
 * por tienda. El binario vive en Azure Blob Storage (mismo contenedor privado que Adjunto); esta
 * tabla solo guarda la referencia.
 *
 * FKs (SQL Server rechaza dos rutas de cascada desde el mismo padre, error 1785, así que solo hay
 * una: PlanogramaVersion → Gondola → EvidenciaImplementacion):
 * - gondola_id → Gondola ON DELETE CASCADE: borrar una góndola (se puede en versiones piloto,
 *   que siguen editables) borra su evidencia en vez de fallar por FK. Como Gondola cuelga en
 *   cascada de PlanogramaVersion, borrar la versión también limpia la evidencia.
 * - planograma_version_id → PlanogramaVersion SIN cascada (la limpieza llega por la góndola).
 * - tienda_id → Tienda SIN cascada: las tiendas no se borran, se desactivan.
 * En todos los casos el blob físico en Azure queda huérfano (la FK no lo cubre), igual que con
 * Adjunto; solo DELETE /evidencias/:id borra el blob.
 */

exports.up = async function (knex) {
  await knex.schema.createTable('EvidenciaImplementacion', (t) => {
    t.increments('id');
    t.integer('planograma_version_id').notNullable()
      .references('id').inTable('PlanogramaVersion');
    t.integer('tienda_id').notNullable()
      .references('id').inTable('Tienda');
    t.integer('gondola_id').notNullable()
      .references('id').inTable('Gondola').onDelete('CASCADE');
    t.string('nombre_original', 255).notNullable();
    t.string('tipo_mime', 100).notNullable();
    t.integer('tamano_bytes').notNullable();
    t.string('blob_container', 100).notNullable();
    t.string('blob_path', 500).notNullable();
    t.string('blob_url', 1000).notNullable();
    t.string('subido_por', 100).notNullable();
    t.datetime('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['tienda_id', 'planograma_version_id'], 'IX_EvidenciaImplementacion_tienda_version');
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('EvidenciaImplementacion');
};
