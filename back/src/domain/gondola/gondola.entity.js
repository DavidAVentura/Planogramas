/**
 * gondola.entity.js
 * Reglas de negocio puras del dominio Gondola.
 * Sin dependencias de Express, Knex ni ninguna infraestructura.
 */

/** Estados de PlanogramaVersion en los que se admite editar sus góndolas. */
const ESTADOS_VERSION_EDITABLE = Object.freeze(['borrador', 'en_desarrollo', 'piloto']);

/**
 * Medidas por defecto de Cemaco para una góndola nueva (cm). Las usan las góndolas que se crean
 * junto con la versión y el Agente Extractor. Mismos valores que `GONDOLA_DEFAULTS` en
 * front/src/constants/valoresPorDefecto.ts (duplicados allá porque el front no importa del back).
 */
const GONDOLA_DEFAULTS = Object.freeze({
  ancho_cm:       200,
  alto_cm:        230,
  profundidad_cm: 50,
});

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
  GONDOLA_DEFAULTS,
  validarVersionEditable,
  validarArrayOrden,
};
