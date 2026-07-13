/**
 * planograma.entity.js
 * Reglas de negocio puras del dominio Planograma.
 * Sin dependencias de Express, Knex ni ninguna infraestructura.
 */

const ESTADOS = Object.freeze({
  BORRADOR:  'borrador',
  ACTIVO:    'activo',
  ARCHIVADO: 'archivado',
});

/** Estados en los que el planograma admite edición de metadatos. */
const ESTADOS_EDITABLES = Object.freeze([ESTADOS.BORRADOR, ESTADOS.ACTIVO]);

/**
 * Retorna el estado inicial para un planograma recién creado.
 * @returns {string}
 */
function calcularEstadoInicial() {
  return ESTADOS.BORRADOR;
}

/**
 * Valida que el planograma puede ser archivado.
 * Lanza un error con status/code si no puede.
 * @param {string} estadoActual
 */
function validarEstadoParaArchivar(estadoActual) {
  if (estadoActual === ESTADOS.ARCHIVADO) {
    const err = new Error('El planograma ya está archivado');
    err.status = 409;
    err.code   = 'CONFLICT';
    throw err;
  }
}

/**
 * Valida que el planograma se encuentra en un estado editable.
 * @param {string} estadoActual
 */
function validarEstadoParaEditar(estadoActual) {
  if (!ESTADOS_EDITABLES.includes(estadoActual)) {
    const err = new Error(`No se puede editar un planograma en estado '${estadoActual}'`);
    err.status = 422;
    err.code   = 'UNPROCESSABLE';
    throw err;
  }
}

module.exports = {
  ESTADOS,
  ESTADOS_EDITABLES,
  calcularEstadoInicial,
  validarEstadoParaArchivar,
  validarEstadoParaEditar,
};
