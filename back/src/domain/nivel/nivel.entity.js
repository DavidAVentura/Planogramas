/**
 * nivel.entity.js
 * Reglas de negocio puras del dominio Nivel.
 * Sin dependencias de Express, Knex ni ninguna infraestructura.
 */

/** Estados de PlanogramaVersion en los que se admite editar sus niveles. */
const ESTADOS_VERSION_EDITABLE = Object.freeze(['borrador', 'en_desarrollo', 'piloto']);

/** Valores permitidos de tipo_accesorio (ver migración 001_esquema_inicial). */
const TIPOS_ACCESORIO = Object.freeze(['GANCHO', 'BANDEJA', 'BARRA', 'CANASTA', 'OTRO']);

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
 * Valida que la versión padre esté en un estado que admite editar sus niveles.
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
    throw errorBadRequest('El array de orden contiene ids de nivel duplicados');
  }
  if (new Set(valores).size !== valores.length) {
    throw errorBadRequest('El array de orden contiene valores de orden duplicados');
  }
}

/**
 * Determina las advertencias (no bloqueantes) al editar un nivel, según CU-03-06:
 * cambio de tipo de accesorio con posiciones existentes, o ancho disponible reducido
 * por debajo del ancho actualmente ocupado por posiciones.
 * @param {{ tipoAccesorioCambio: boolean, totalPosiciones: number, anchoReducido: boolean }} contexto
 * @returns {string[]}
 */
function calcularAdvertenciasEdicion({ tipoAccesorioCambio, totalPosiciones, anchoReducido }) {
  const advertencias = [];

  if (tipoAccesorioCambio && totalPosiciones > 0) {
    advertencias.push('El tipo de accesorio cambió. Revisa unidades_por_facing en las posiciones existentes.');
  }
  if (anchoReducido) {
    advertencias.push('El ancho disponible es menor al ancho actualmente ocupado por posiciones.');
  }

  return advertencias;
}

module.exports = {
  ESTADOS_VERSION_EDITABLE,
  TIPOS_ACCESORIO,
  validarVersionEditable,
  validarArrayOrden,
  calcularAdvertenciasEdicion,
};
