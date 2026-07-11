/**
 * errorHandler.js
 * Middleware de error global. Debe registrarse ÚLTIMO en app.js.
 * Convierte cualquier error a la forma estándar: { error: { code, message, details? } }
 */

const { NODE_ENV } = require('../../../config/env');

/**
 * Mapeo de nombres de error conocidos a códigos HTTP.
 * Los usecases lanzan errores con err.code y err.status para comunicar
 * situaciones de negocio sin acoplar el dominio a HTTP.
 */
const STATUS_MAP = {
  VALIDATION_ERROR:  400,
  UNAUTHORIZED:      401,
  FORBIDDEN:         403,
  NOT_FOUND:         404,
  CONFLICT:          409,
  UNPROCESSABLE:     422,
};

module.exports = function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Errores lanzados explícitamente desde usecases/controllers con err.status
  if (err.status) {
    return res.status(err.status).json({
      error: {
        code:    err.code    || 'ERROR',
        message: err.message || 'Error inesperado',
        ...(err.details && { details: err.details }),
      },
    });
  }

  // Errores de validación de Joi
  if (err.isJoi || err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        code:    'VALIDATION_ERROR',
        message: 'Datos de entrada inválidos',
        details: err.details?.map((d) => d.message) ?? [err.message],
      },
    });
  }

  // Errores con code conocido (lanzados desde dominio sin status explícito)
  if (err.code && STATUS_MAP[err.code]) {
    return res.status(STATUS_MAP[err.code]).json({
      error: {
        code:    err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
  }

  // Error inesperado — no exponer detalle interno en producción
  const isDev = NODE_ENV === 'development';
  console.error('[errorHandler]', err);

  return res.status(500).json({
    error: {
      code:    'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      ...(isDev && { details: err.message }),
    },
  });
};
