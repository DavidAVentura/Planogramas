/**
 * validarCuerpo.js
 * Valida el cuerpo JSON de forma estricta (clave desconocida = 400) ANTES del limitador: una
 * petición mal formada se rechaza sin gastar cupo. Mismo criterio que `validarQuery`, pero sobre
 * `req.body`. El controller vuelve a validar y usa el valor devuelto por Joi.
 */

const { validarQueryEstricta } = require('../../../application/compartido/validacion');

function validarCuerpo(schema) {
  return (req, _res, next) => {
    try {
      // Se copia el cuerpo: sin parser (o sin cuerpo) llega `undefined` y se valida como `{}`.
      validarQueryEstricta(schema, { ...(req.body ?? {}) });
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { validarCuerpo };
