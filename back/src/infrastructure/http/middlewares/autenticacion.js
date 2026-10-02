/**
 * autenticacion.js
 * Exige `Authorization: Bearer {jwt CAO}` en cada request y lo valida contra CAO
 * (ver infrastructure/cao/caoAuthClient.js). Si es válido deja el usuario en `req.usuario` y
 * abre el contexto de la solicitud con el token, que luego usa el exchange con CATI.
 * Con el token ya validado dispara el keepalive de CAO (sin esperar la respuesta) para mantener
 * viva la sesión mientras el usuario siga usando la app.
 */

const caoAuthClient            = require('../../cao/caoAuthClient');
const { ejecutarConContexto }  = require('../contextoSolicitud');

function extraerBearer(req) {
  const [esquema, token] = (req.headers.authorization ?? '').split(' ');
  return esquema?.toLowerCase() === 'bearer' && token ? token : null;
}

module.exports = async function autenticacion(req, res, next) {
  const token = extraerBearer(req);
  if (!token) {
    const err = new Error('Falta el token de sesión');
    err.status = 401;
    err.code   = 'UNAUTHORIZED';
    return next(err);
  }

  try {
    req.usuario = await caoAuthClient.validarToken(token);
  } catch (err) {
    return next(err);
  }

  caoAuthClient.mantenerSesionActiva(token);

  ejecutarConContexto({ tokenCAO: token, usuario: req.usuario }, () => next());
};
