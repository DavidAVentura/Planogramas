/**
 * caoAuthClient.js
 * Valida el JWT de un usuario contra CAO (CemacoAllInOne) por introspección activa:
 *   GET {CAO_BASE_URL}/auth/validar_token?cod_modulo={CAO_COD_MODULO}
 *   Header Authorization: Bearer {jwt}
 * El login ocurre en otra aplicación; este backend nunca ve credenciales de usuario.
 *
 * Los tokens válidos se cachean en memoria un tiempo corto (TTL_VALIDACION_MS, acotado por el
 * `exp` del JWT) para no llamar a CAO en cada request de la misma pantalla.
 *
 * Además, cada request autenticado renueva la sesión en CAO (ventana deslizante) con:
 *   POST {CAO_BASE_URL}/auth/keepalive   → { nuevaExpiracion }
 * El keepalive no bloquea el request y se limita a uno por token cada INTERVALO_KEEPALIVE_MS.
 */

const env = require('../../config/env');

const TTL_VALIDACION_MS = 2 * 60 * 1000;
const cache = new Map(); // jwt → { usuario, expiraEn }

const INTERVALO_KEEPALIVE_MS = 60 * 1000;
const ultimoKeepAlive = new Map(); // jwt → timestamp del último keepalive enviado

function errorNoAutenticado(mensaje) {
  const err = new Error(mensaje);
  err.status = 401;
  err.code   = 'UNAUTHORIZED';
  return err;
}

function errorServicioNoDisponible(mensaje, causa) {
  const err = new Error(mensaje);
  err.status = 503;
  err.code   = 'SERVICE_UNAVAILABLE';
  if (causa) err.details = causa.message;
  return err;
}

function decodificarPayloadJwt(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function primerValor(...valores) {
  return valores.find((v) => v !== undefined && v !== null && v !== '');
}

/**
 * Normaliza la respuesta de CAO a un usuario de la app. Forma confirmada de validar_token:
 *   { token, user: "100702", username: "NOMBRE COMPLETO",
 *     perfiles: [{ cod_perfil, perfil, permisos: ["SCP002", ...] }], tiendas: [] }
 * `user` es el número de empleado y `username` el nombre completo (no un login). Los claims del
 * JWT solo completan lo que falte. `cao` guarda la respuesta cruda, sin el token que CAO devuelve.
 */
function mapearUsuario(cuerpo, claims) {
  const { token: _token, ...datos } = cuerpo ?? {};
  const c = claims ?? {};

  const numeroEmpleado = primerValor(datos.user, c.user, c.sub);
  const perfiles = (Array.isArray(datos.perfiles) ? datos.perfiles : []).map((p) => ({
    codigo:   p.cod_perfil,
    nombre:   p.perfil,
    permisos: Array.isArray(p.permisos) ? p.permisos : [],
  }));

  return {
    id:             numeroEmpleado,
    numeroEmpleado: numeroEmpleado != null ? String(numeroEmpleado) : undefined,
    usuario:        numeroEmpleado != null ? String(numeroEmpleado) : undefined,
    nombre:         primerValor(datos.username, c.username, c.name),
    correo:         primerValor(datos.correo, datos.email, c.correo, c.email),
    perfiles,
    // Permisos efectivos = unión de los permisos de todos los perfiles del usuario en el módulo.
    permisos:       [...new Set(perfiles.flatMap((p) => p.permisos))],
    // Tiendas del usuario en CAO; hoy viene vacío. Cuando se llene, puede reemplazar el selector de
    // tienda del Implementador.
    tiendas:        Array.isArray(datos.tiendas) ? datos.tiendas : [],
    cao:            datos,
  };
}

function respuestaIndicaInvalido(cuerpo) {
  const datos = cuerpo?.data ?? cuerpo;
  if (!datos || typeof datos !== 'object') return false;
  return [cuerpo?.success, cuerpo?.valido, cuerpo?.valid, datos.valido, datos.valid].includes(false);
}

async function consultarCao(token) {
  const url = `${env.cao.baseUrl}/auth/validar_token?cod_modulo=${encodeURIComponent(env.cao.codModulo)}`;

  let response;
  try {
    response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  } catch (err) {
    throw errorServicioNoDisponible('No se pudo conectar con CAO para validar la sesión', err);
  }

  // CAO responde 401 si el token falta/no es válido y 500 si viene malformado (observado);
  // ambos se tratan como sesión inválida. 502/503/504 sí son caída del servicio.
  if ([502, 503, 504].includes(response.status)) {
    throw errorServicioNoDisponible(`CAO respondió con status ${response.status}`);
  }
  if (!response.ok) {
    throw errorNoAutenticado('Sesión inválida o sin acceso al módulo');
  }

  const texto  = await response.text();
  let cuerpo;
  try {
    cuerpo = texto ? JSON.parse(texto) : {};
  } catch {
    cuerpo = { mensaje: texto };
  }

  if (respuestaIndicaInvalido(cuerpo)) {
    throw errorNoAutenticado('Sesión inválida o sin acceso al módulo');
  }

  return cuerpo;
}

/**
 * Valida el JWT del usuario contra CAO y retorna el usuario normalizado.
 * Lanza 401 si el token no es válido y 503 si CAO no está disponible.
 * @param {string} token
 * @returns {Promise<object>}
 */
async function validarToken(token) {
  const ahora = Date.now();
  const enCache = cache.get(token);
  if (enCache && ahora < enCache.expiraEn) return enCache.usuario;
  cache.delete(token);

  // El `exp` del JWT no se revisa localmente: el keepalive renueva la sesión en CAO sin emitir un
  // token nuevo, así que el `exp` original no indica que la sesión venció. CAO decide.
  const claims  = decodificarPayloadJwt(token);
  const cuerpo  = await consultarCao(token);
  const usuario = mapearUsuario(cuerpo, claims);

  cache.set(token, { usuario, expiraEn: ahora + TTL_VALIDACION_MS });
  limpiarExpirados(ahora);

  return usuario;
}

function limpiarExpirados(ahora) {
  for (const [clave, entrada] of cache) {
    if (ahora >= entrada.expiraEn) cache.delete(clave);
  }
  for (const [clave, enviadoEn] of ultimoKeepAlive) {
    if (ahora - enviadoEn >= INTERVALO_KEEPALIVE_MS) ultimoKeepAlive.delete(clave);
  }
}

/**
 * Renueva la sesión del usuario en CAO. Nunca lanza: está pensado para dispararse sin `await`
 * desde el middleware. Si CAO responde 401 la sesión ya no es válida y se saca el token del
 * cache, para que el siguiente request lo revalide (y responda 401) en vez de esperar el TTL.
 * @param {string} token
 * @returns {Promise<void>}
 */
async function mantenerSesionActiva(token) {
  const ahora = Date.now();
  const enviadoEn = ultimoKeepAlive.get(token);
  if (enviadoEn && ahora - enviadoEn < INTERVALO_KEEPALIVE_MS) return;
  ultimoKeepAlive.set(token, ahora);

  try {
    const response = await fetch(`${env.cao.baseUrl}/auth/keepalive`, {
      method:  'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      cache.delete(token);
      ultimoKeepAlive.delete(token);
      return;
    }
    if (!response.ok) {
      ultimoKeepAlive.delete(token); // reintenta en el siguiente request
      console.warn(`[caoAuthClient] Keepalive de CAO respondió con status ${response.status}`);
    }
  } catch (err) {
    ultimoKeepAlive.delete(token);
    console.warn('[caoAuthClient] No se pudo enviar el keepalive a CAO:', err.message);
  }
}

module.exports = { validarToken, mantenerSesionActiva };
