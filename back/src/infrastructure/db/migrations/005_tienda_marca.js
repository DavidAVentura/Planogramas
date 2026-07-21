/**
 * 005_tienda_marca.js
 * Tienda necesita distinguir la marca del punto de venta (Cemaco, Jugueton,
 * Bebé Jugueton) además del código y tipo — el mismo local físico puede tener
 * códigos separados por marca (ej. T0QM / TJQM son Cemaco/Jugueton Chiquimula).
 */

exports.up = async function (knex) {
  await knex.schema.alterTable('Tienda', (t) => {
    t.string('Marca', 50).nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('Tienda', (t) => {
    t.dropColumn('Marca');
  });
};
