/**
 * accesorio.entity.js
 * Reglas de negocio puras del dominio Accesorio (catálogo de gondolería).
 * Sin dependencias de Express, Knex ni ninguna infraestructura.
 */

const TIPOS = Object.freeze(['GANCHO', 'BANDEJA', 'BARRA', 'BOTADERO', 'CANASTA', 'PARRILLA_DIVISOR', 'OTRO']);

/** Forma canónica de un código de accesorio: sin espacios en los extremos y en mayúsculas
 * (los Excel de planogramas traen el mismo código escrito de distintas formas). */
function normalizarCodigo(codigo) {
  return String(codigo ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
}

module.exports = {
  TIPOS,
  normalizarCodigo,
};
