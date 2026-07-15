/**
 * caoClient.js
 * Primer salto de autenticación hacia CATI: CAO (CemacoAllInOne).
 * POST {CAO_BASE_URL}/auth { user, password } → { data: { token } } (token CAO), insumo del
 * exchange en tokenManager.
 */

const env = require('../../config/env');

function errorServicioNoDisponible(mensaje, causa) {
  const err = new Error(mensaje);
  err.status = 503;
  err.code   = 'SERVICE_UNAVAILABLE';
  if (causa) err.details = causa.message;
  return err;
}

async function autenticar() {
  let response;
  try {
    response = await fetch(`${env.cao.baseUrl}/auth`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user: env.cao.user, password: env.cao.password }),
    });
  } catch (err) {
    throw errorServicioNoDisponible('No se pudo conectar con CAO', err);
  }

  if (!response.ok) {
    throw errorServicioNoDisponible(`CAO respondió con status ${response.status}`);
  }

  const body = await response.json();
  const token = body?.data?.token;
  if (!token) {
    throw errorServicioNoDisponible('CAO no devolvió un token válido');
  }

  return token;
}

module.exports = { autenticar };
