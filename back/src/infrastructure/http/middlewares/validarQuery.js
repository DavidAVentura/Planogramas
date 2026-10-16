/**
 * validarQuery.js
 * Valida la query de forma estricta ANTES del limitador: una petición mal formada (400) se rechaza
 * sin gastar cupo y el limitador cuenta todas las demás, incluso las que el cliente aborte.
 */

const { validarQueryEstricta } = require('../../../application/compartido/validacion');

function validarQuery(schema) {
  return (req, _res, next) => {
    try {
      // `req.query` de Express 5 puede no tener prototipo: se copia antes de validar.
      validarQueryEstricta(schema, { ...req.query });
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { validarQuery };
