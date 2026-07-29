/**
 * gondola.entity.js
 * Reglas de negocio puras del dominio Gondola.
 * Sin dependencias de Express, Knex ni ninguna infraestructura.
 */

/** Estados de PlanogramaVersion en los que se admite editar sus góndolas. */
const ESTADOS_VERSION_EDITABLE = Object.freeze(['borrador', 'en_desarrollo', 'piloto']);

function errorBadRequest(mensaje) {
  const err = new Error(mensaje);
  err.status = 400;
  err.code   = 'VALIDATION_ERROR';
  return err;
}

function errorUnprocessable(mensaje, details) {
  const err = new Error(mensaje);
  err.status = 422;
  err.code   = 'UNPROCESSABLE';
  if (details) err.details = details;
  return err;
}

/**
 * Valida que la versión padre esté en un estado que admite editar sus góndolas.
 * @param {string} estadoVersion
 */
function validarVersionEditable(estadoVersion) {
  if (!ESTADOS_VERSION_EDITABLE.includes(estadoVersion)) {
    throw errorUnprocessable('La versión no está en modo editable', { estadoActual: estadoVersion });
  }
}

/**
 * Valida la forma del array de reordenamiento: no vacío, ids únicos, valores de orden únicos.
 * @param {Array<{id:number, orden:number}>} orden
 */
function validarArrayOrden(orden) {
  if (!Array.isArray(orden) || orden.length === 0) {
    throw errorBadRequest('El array de orden no puede estar vacío');
  }

  const ids     = orden.map((o) => o.id);
  const valores = orden.map((o) => o.orden);

  if (new Set(ids).size !== ids.length) {
    throw errorBadRequest('El array de orden contiene ids de góndola duplicados');
  }
  if (new Set(valores).size !== valores.length) {
    throw errorBadRequest('El array de orden contiene valores de orden duplicados');
  }
}

module.exports = {
  ESTADOS_VERSION_EDITABLE,
  validarVersionEditable,
  validarArrayOrden,
};
