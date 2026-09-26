/**
 * tokenManager.js
 * Intercambia el JWT CAO del usuario de la request actual (lo deja el middleware de
 * autenticación en el contexto de la solicitud) por un accessToken de CATI
 * (POST {CATI_BASE_URL}/Auth/exchange) y lo cachea en memoria por token CAO hasta que expira.
 */

const env                  = require('../../config/env');
const { obtenerContexto }  = require('../http/contextoSolicitud');

const MARGEN_EXPIRACION_MS = 60 * 1000;
const TTL_FALLBACK_MS      = 10 * 60 * 1000; // si el JWT no trae `exp` decodificable

const cache = new Map(); // tokenCAO → { accessToken, expiraEn }

function errorServicioNoDisponible(mensaje, causa) {
  const err = new Error(mensaje);
  err.status = 503;
  err.code   = 'SERVICE_UNAVAILABLE';
  if (causa) err.details = causa.message;
  return err;
}

function errorSinSesion() {
  const err = new Error('No hay una sesión de usuario para consultar CATI');
  err.status = 401;
  err.code   = 'UNAUTHORIZED';
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
  // CATI puede envolver la respuesta en { data: {...} } o devolverla plana; no hay forma de
  // confirmarlo desde esta red (10.20.12.9 solo es alcanzable por VPN/red interna de Cemaco),
  // así que se soportan ambas formas.
  const accessToken = body?.data?.accessToken ?? body?.accessToken;
  if (!accessToken) {
    throw errorServicioNoDisponible('CATI no devolvió un accessToken válido');
  }

  return accessToken;
}

function limpiarExpirados(ahora) {
  for (const [clave, entrada] of cache) {
    if (ahora >= entrada.expiraEn) cache.delete(clave);
  }
}

/**
 * Retorna un accessToken de CATI válido para el usuario de la request actual, reutilizando el
 * cacheado si no ha expirado.
 * @returns {Promise<string>}
 */
async function obtenerAccessToken() {
  const tokenCAO = obtenerContexto()?.tokenCAO;
  if (!tokenCAO) throw errorSinSesion();

  const ahora   = Date.now();
  const enCache = cache.get(tokenCAO);
  if (enCache && ahora < enCache.expiraEn) {
    return enCache.accessToken;
  }

  const accessToken = await intercambiarToken(tokenCAO);

  const expiracion = decodificarExpiracionJwt(accessToken);
  cache.set(tokenCAO, {
    accessToken,
    expiraEn: (expiracion ?? ahora + TTL_FALLBACK_MS) - MARGEN_EXPIRACION_MS,
  });
  limpiarExpirados(ahora);

  return accessToken;
}

module.exports = { obtenerAccessToken };
