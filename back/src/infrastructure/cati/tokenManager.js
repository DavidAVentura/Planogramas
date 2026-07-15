/**
 * tokenManager.js
 * Segundo salto de autenticación hacia CATI: intercambia el token CAO por un accessToken
 * de CATI (POST {CATI_BASE_URL}/Auth/exchange) y lo cachea en memoria hasta que expira.
 */

const env       = require('../../config/env');
const caoClient = require('./caoClient');

const MARGEN_EXPIRACION_MS = 60 * 1000;
const TTL_FALLBACK_MS      = 10 * 60 * 1000; // si el JWT no trae `exp` decodificable

let cache = { accessToken: null, expiraEn: 0 };

function errorServicioNoDisponible(mensaje, causa) {
  const err = new Error(mensaje);
  err.status = 503;
  err.code   = 'SERVICE_UNAVAILABLE';
  if (causa) err.details = causa.message;
  return err;
}

function decodificarExpiracionJwt(token) {
  try {
    const payload = token.split('.')[1];
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return exp ? exp * 1000 : null;
  } catch {
    return null;
  }
}

async function intercambiarToken(tokenCAO) {
  let response;
  try {
    response = await fetch(`${env.cati.baseUrl}/Auth/exchange`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    env.cati.apiKey,
      },
      body: JSON.stringify({ tokenCemacoAllInOne: tokenCAO }),
    });
  } catch (err) {
    throw errorServicioNoDisponible('No se pudo conectar con CATI', err);
  }

  if (!response.ok) {
    throw errorServicioNoDisponible(`CATI respondió con status ${response.status} en el exchange`);
  }

  const body = await response.json();
  // Igual que CAO, CATI puede envolver la respuesta en { data: {...} } o devolverla plana;
  // no hay forma de confirmarlo desde esta red (10.20.12.9 solo es alcanzable por VPN/red
  // interna de Cemaco), así que se soportan ambas formas.
  const accessToken = body?.data?.accessToken ?? body?.accessToken;
  if (!accessToken) {
    throw errorServicioNoDisponible('CATI no devolvió un accessToken válido');
  }

  return accessToken;
}

/**
 * Retorna un accessToken de CATI válido, reutilizando el cacheado si no ha expirado.
 * @returns {Promise<string>}
 */
async function obtenerAccessToken() {
  if (cache.accessToken && Date.now() < cache.expiraEn) {
    return cache.accessToken;
  }

  const tokenCAO    = await caoClient.autenticar();
  const accessToken = await intercambiarToken(tokenCAO);

  const expiracion = decodificarExpiracionJwt(accessToken);
  cache = {
    accessToken,
    expiraEn: (expiracion ?? Date.now() + TTL_FALLBACK_MS) - MARGEN_EXPIRACION_MS,
  };

  return accessToken;
}

module.exports = { obtenerAccessToken };
