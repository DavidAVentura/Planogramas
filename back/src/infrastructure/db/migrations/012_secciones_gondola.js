/**
 * 012_secciones_gondola.js
 * Agrega la tabla Seccion — partición de una góndola en columnas o franjas (anidables), cada una
 * con sus propios niveles. Se guarda como árbol: una fila "división" (es_division = 1) reparte su
 * espacio entre sus hijas según `direccion` (COLUMNAS: de izquierda a derecha; FILAS: de arriba
 * hacia abajo); las hojas (es_division = 0) son las secciones donde viven los niveles.
 *
 * Es aditiva: una góndola sin filas en Seccion se sigue comportando exactamente igual que antes
 * (sus niveles con seccion_id NULL pertenecen a la góndola completa).
 *
 * FKs (SQL Server rechaza dos rutas de cascada desde el mismo padre, error 1785):
 * - Seccion.gondola_id → Gondola ON DELETE CASCADE (borrar la góndola/versión limpia su árbol).
 * - Seccion.padre_id   → Seccion SIN cascada (auto-referencia; se borra junto con la góndola).
 * - Nivel.seccion_id   → Seccion SIN cascada: Gondola → Nivel ya es CASCADE; una segunda ruta
 *   Gondola → Seccion → Nivel en cascada sería rechazada.
 */

exports.up = async function (knex) {
  await knex.schema.createTable('Seccion', (t) => {
    t.increments('id');
    t.integer('gondola_id').notNullable()
      .references('id').inTable('Gondola').onDelete('CASCADE');
    t.integer('padre_id').nullable()
      .references('id').inTable('Seccion');
    t.boolean('es_division').notNullable().defaultTo(false);
    t.string('direccion', 10).nullable();           // COLUMNAS | FILAS (solo divisiones)
    t.integer('orden').notNullable().defaultTo(1);  // orden entre hermanas
    t.decimal('tam_cm', 8, 2).notNullable();        // medida en la dirección del padre
    t.index(['gondola_id'], 'IX_Seccion_gondola');
  });

  await knex.schema.alterTable('Nivel', (t) => {
    t.integer('seccion_id').nullable()
      .references('id').inTable('Seccion');
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('Nivel', (t) => {
    t.dropForeign(['seccion_id']);
    t.dropColumn('seccion_id');
  });
  await knex.schema.dropTableIfExists('Seccion');
};
