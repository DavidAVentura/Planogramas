/**
 * 015_planograma_descripcion.js
 * Planograma.descripcion: texto libre que describe qué contiene el planograma. El nombre se usa
 * como correlativo (AUTOS 01, AUTOS 02…) y no basta para identificarlo ni buscarlo.
 *
 * Aditiva y nullable: los planogramas existentes quedan sin descripción.
 */

exports.up = async function (knex) {
  await knex.raw('ALTER TABLE Planograma ADD descripcion NVARCHAR(500) NULL');
};

exports.down = async function (knex) {
  await knex.raw('ALTER TABLE Planograma DROP COLUMN descripcion');
};
