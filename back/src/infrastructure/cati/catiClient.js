/**
 * catiClient.js
 * Cliente HTTP hacia CATI (catálogo y jerarquía). Adjunta Bearer + x-api-key en cada
 * llamada (ver tokenManager) y cachea en memoria las respuestas de jerarquía por 30 minutos,
 * ya que ese catálogo cambia raramente (ver contratos en Arquitectura/Contratos/11_jerarquia/).
 */

const env          = require('../../config/env');
const tokenManager = require('./tokenManager');

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache        = new Map(); // clave → { valor, expiraEn }

function errorServicioNoDisponible(mensaje, causa) {
  const err = new Error(mensaje);
  err.status = 503;
  err.code   = 'SERVICE_UNAVAILABLE';
  if (causa) err.details = causa.message;
  return err;
}

function obtenerDeCache(clave) {
  const entrada = cache.get(clave);
  if (!entrada || Date.now() >= entrada.expiraEn) return undefined;
  return entrada.valor;
}

function guardarEnCache(clave, valor) {
  cache.set(clave, { valor, expiraEn: Date.now() + CACHE_TTL_MS });
}

function mapJerarquia(item) {
  return { id: item.id, name: item.name };
}

/**
 * GET autenticado contra CATI. Retorna `null` si CATI responde 404 (recurso no encontrado
 * dentro del catálogo, ej. área inexistente), y lanza 503 para cualquier otro error.
 * @param {string} path
 * @param {Record<string, string>} [params]
 * @returns {Promise<any>}
 */
async function get(path, params = {}) {
  const token = await tokenManager.obtenerAccessToken();
  const query = new URLSearchParams(params).toString();
  const url   = `${env.cati.baseUrl}${path}${query ? `?${query}` : ''}`;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-api-key':   env.cati.apiKey,
      },
    });
  } catch (err) {
    throw errorServicioNoDisponible('No se pudo conectar con CATI', err);
  }

  if (response.status === 404) return null;
  if (!response.ok) {
    throw errorServicioNoDisponible(`CATI respondió con status ${response.status} en ${path}`);
  }

  return response.json();
}

/**
 * Lista las áreas de la jerarquía comercial (cacheado 30 min).
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
async function obtenerAreas() {
  const cacheado = obtenerDeCache('areas');
  if (cacheado) return cacheado;

  const items = await get('/Jerarquia/Area');
  const areas = (items ?? []).map(mapJerarquia);

  guardarEnCache('areas', areas);
  return areas;
}

/**
 * Lista los departamentos de un área (cacheado 30 min por área).
 * @param {string} areaId
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
async function obtenerDepartamentos(areaId) {
  const clave    = `departamentos:${areaId}`;
  const cacheado = obtenerDeCache(clave);
  if (cacheado) return cacheado;

  const items = await get('/Jerarquia/Departamento', { area: areaId, profile: 'CEMACO' });
  const departamentos = (items ?? []).map(mapJerarquia);

  guardarEnCache(clave, departamentos);
  return departamentos;
}

module.exports = { get, obtenerAreas, obtenerDepartamentos };
