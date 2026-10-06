/**
 * 013_montaje_y_por_ubicar.js
 * Datos de montaje que trae el Excel de productos del planograma (importador de productos):
 *
 * - Posicion.ganchos: arreglo JSON de números de gancho (ej. [4,9,14,19]). Cuando existe, manda
 *   sobre la numeración calculada (ver skuVersion.entity.js `recorrerVersion`): los ganchos del
 *   Excel no siempre son correlativos (un producto puede ocupar una columna de varias filas).
 * - PosicionAccesorio.tamano_pulgadas: medida del accesorio de montaje de ese producto (12", 22").
 * - Gondola.por_ubicar: marca la góndola "Por ubicar" que crea el importador de productos — sus
 *   niveles son de relleno (10 posiciones cada uno) hasta que el analista mueve cada producto a su
 *   lugar real. No participa de la numeración calculada de ganchos.
 *
 * Aditiva: ningún valor existente cambia de significado.
 */

exports.up = async function (knex) {
  await knex.raw('ALTER TABLE Posicion ADD ganchos NVARCHAR(MAX) NULL');
  await knex.raw('ALTER TABLE PosicionAccesorio ADD tamano_pulgadas DECIMAL(6,2) NULL');
  await knex.raw('ALTER TABLE Gondola ADD por_ubicar BIT NOT NULL CONSTRAINT DF_Gondola_por_ubicar DEFAULT 0');
};

exports.down = async function (knex) {
  await knex.raw('ALTER TABLE Gondola DROP CONSTRAINT DF_Gondola_por_ubicar');
  await knex.raw('ALTER TABLE Gondola DROP COLUMN por_ubicar');
  await knex.raw('ALTER TABLE PosicionAccesorio DROP COLUMN tamano_pulgadas');
  await knex.raw('ALTER TABLE Posicion DROP COLUMN ganchos');
};
