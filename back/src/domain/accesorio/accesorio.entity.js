/**
 * accesorio.entity.js
 * Reglas de negocio puras del dominio Accesorio (catálogo de gondolería).
 * Sin dependencias de Express, Knex ni ninguna infraestructura.
 */

const TIPOS = Object.freeze(['GANCHO', 'BANDEJA', 'BARRA', 'CANASTA', 'OTRO']);

module.exports = {
  TIPOS,
};
