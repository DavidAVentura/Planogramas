// S-04, S-07, S-12: prueba HTTP de la matriz endpoint → regla con CAO/BD/CATI/Blob falsos.
// Un 403/401 debe resolverse sin tocar BD, CATI ni Blob y el 403 va antes que el 400/404.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');

process.env.CAO_BASE_URL = process.env.CAO_BASE_URL || 'http://cao.test';

const SRC = path.join(__dirname, '../../src');
const accesos = { bd: 0, cati: 0, blob: 0 };
let contando = false;

function crearStub(clave) {
  const falla = () => {
    if (contando) accesos[clave]++;
    throw new Error(`${clave} no disponible en prueba`);
  };
  const stub = new Proxy(function stubInfra() {}, {
    // Fuera de la fase de requests (carga de módulos) devuelve el propio stub sin contar.
    get: (_t, prop) => (prop === 'then' || typeof prop === 'symbol' ? undefined : (contando ? falla() : stub)),
    apply: () => falla(),
  });
  return stub;
}

function reemplazarModulo(relativo, exports) {
  const ruta = require.resolve(path.join(SRC, relativo));
  require.cache[ruta] = { id: ruta, filename: ruta, loaded: true, exports, children: [], paths: [] };
}

const rango = (desde, hasta) => Array.from({ length: hasta - desde + 1 }, (_, i) => `PLA${String(desde + i).padStart(3, '0')}`);
const usuario = (numeroEmpleado, permisos) => Object.freeze({
  id: numeroEmpleado, numeroEmpleado, usuario: numeroEmpleado, nombre: 'Prueba',
  perfiles: Object.freeze([]), permisos: Object.freeze(permisos), tiendas: Object.freeze([]),
});
const USUARIOS = Object.freeze({
  analista:     usuario('1', rango(1, 10)),
  tienda:       usuario('2', ['PLA009', 'PLA010']),
  sinPermisos:  usuario('3', []),
  soloPLA009:   usuario('4', ['PLA009']),
  soloPLA010:   usuario('5', ['PLA010']),
  sinIdentidad: usuario(undefined, rango(1, 10)),
  sieteDeOcho:  usuario('7', [...rango(1, 7), 'PLA009', 'PLA010']),
});

reemplazarModulo('infrastructure/cao/caoAuthClient.js', {
  validarToken: async (token) => {
    const u = USUARIOS[token];
    if (!u) { const e = new Error('Sesión inválida'); e.status = 401; e.code = 'UNAUTHORIZED'; throw e; }
    return u;
  },
  mantenerSesionActiva: () => {},
});
reemplazarModulo('infrastructure/db/connection.js', crearStub('bd'));
reemplazarModulo('infrastructure/cati/catiClient.js', crearStub('cati'));
reemplazarModulo('infrastructure/storage/blobClient.js', crearStub('blob'));

const app = require('../../src/infrastructure/http/app');

let servidor; let base;
test.before(async () => {
  servidor = http.createServer(app);
  await new Promise((resolve) => servidor.listen(0, resolve));
  base = `http://127.0.0.1:${servidor.address().port}/api/v1`;
});
test.after(async () => {
  servidor.closeAllConnections?.();
  await new Promise((resolve) => servidor.close(resolve));
});

async function llamar(metodo, ruta, token) {
  const opciones = { method: metodo, headers: { Authorization: `Bearer ${token}` } };
  if (metodo !== 'GET' && metodo !== 'DELETE') {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = '{}';
  }
  const res = await fetch(`${base}${ruta}`, opciones);
  await res.text();
  return res.status;
}

const PROHIBIDAS_TIENDA = [
  ['POST', '/planogramas'], ['PATCH', '/planogramas/1'], ['POST', '/planogramas/1/archivar'],
  ['POST', '/planogramas/1/versiones'], ['PATCH', '/versiones/1'], ['PATCH', '/versiones/1/guardar'],
  ['POST', '/versiones/1/promover'], ['POST', '/versiones/1/archivar'], ['PUT', '/versiones/1/tiendas'],
  ['POST', '/versiones/1/gondolas'], ['POST', '/versiones/1/importar-layout'],
  ['POST', '/asignaciones/ediciones'], ['POST', '/tiendas'], ['PATCH', '/tiendas/1'],
  ['DELETE', '/adjuntos/1'], ['POST', '/versiones/1/adjuntos/subida'],
  ['PATCH', '/catalog/productos/X/dimensiones'], ['POST', '/agente-extractor/imagen'],
  ['POST', '/voz/tts'], ['PATCH', '/posiciones/1/asignar-sku'], ['POST', '/accesorios'],
  ['GET', '/planogramas'], ['GET', '/versiones/1'], ['GET', '/versiones/1/estructura'],
  ['GET', '/asignaciones'], ['GET', '/implementacion/versiones'], ['GET', '/catalog/productos'],
  ['GET', '/implementacion/productos'], ['POST', '/implementacion/productos/exportar'],
  ['GET', '/catalog/productos/123'], ['GET', '/jerarquia/areas'], ['GET', '/posiciones/por-sku'],
];
const PASA_TIENDA = [
  ['GET', '/tiendas'], ['GET', '/tiendas/1/planogramas'], ['GET', '/tiendas/1/implementacion'],
  ['GET', '/tiendas/1/implementacion/productos'], ['GET', '/tiendas/1/versiones/1/evidencias'],
  ['POST', '/tiendas/1/versiones/1/evidencias'], ['GET', '/evidencias/1/descargar'],
  ['DELETE', '/evidencias/1'], ['GET', '/versiones/1/adjuntos'], ['GET', '/adjuntos/1/url-descarga'],
];

test('matriz de permisos por HTTP', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  t.mock.method(console, 'error', () => {});
  const fallos = [];
  let prohibidos = 0;

  async function verificar(token, metodo, ruta, esperado) {
    const antes = accesos.bd + accesos.cati + accesos.blob;
    const status = await llamar(metodo, ruta, token);
    const etiqueta = `${token} ${metodo} ${ruta}`;
    const cumple = esperado === 'pasa' ? ![401, 403, 404].includes(status) : status === esperado;
    if (!cumple) fallos.push(`${etiqueta}: esperado ${esperado}, recibido ${status}`);
    if (esperado === 403 || esperado === 401) {
      if (esperado === 403) prohibidos++;
      if (accesos.bd + accesos.cati + accesos.blob !== antes) fallos.push(`${etiqueta}: tocó BD/CATI/Blob`);
    }
  }

  contando = true;
  try {
    for (const [m, r] of PROHIBIDAS_TIENDA) await verificar('tienda', m, r, 403);
    for (const [m, r] of PASA_TIENDA) await verificar('tienda', m, r, 'pasa');
    for (const [m, r] of [...PROHIBIDAS_TIENDA, ...PASA_TIENDA]) await verificar('sinPermisos', m, r, 403);
    assert.equal(await llamar('GET', '/auth/sesion', 'sinPermisos'), 200);

    await verificar('soloPLA009', 'GET', '/tiendas/1/implementacion/productos', 403);
    await verificar('soloPLA009', 'GET', '/tiendas/1/implementacion', 'pasa');
    await verificar('soloPLA010', 'GET', '/tiendas/1/implementacion', 'pasa');
    await verificar('soloPLA010', 'GET', '/tiendas/1/implementacion/productos', 'pasa');
    await verificar('sieteDeOcho', 'GET', '/planogramas', 403);

    await verificar('analista', 'GET', '/versiones/abc', 'pasa');
    await verificar('tienda', 'GET', '/versiones/abc', 403);
    // Exportación por planograma: el cuerpo de la matriz ({}) es inválido y aun así gana el 403; sin sesión, 401.
    await verificar('analista', 'POST', '/implementacion/productos/exportar', 'pasa'); // llega a la validación: 400
    await verificar('soloPLA009', 'POST', '/implementacion/productos/exportar', 403);
    await verificar('noexiste', 'POST', '/implementacion/productos/exportar', 401);
    await verificar('noexiste', 'GET', '/implementacion/productos?versionIds=1', 401);
    await verificar('sinIdentidad', 'POST', '/tiendas/1/versiones/1/evidencias', 401);
    await verificar('sinIdentidad', 'GET', '/auth/sesion', 401);
  } finally {
    contando = false;
  }

  assert.deepEqual(fallos, []);

  // S-12: un registro por 403 y ninguno con el token
  const registros = warn.mock.calls.map((c) => c.arguments.join(' '));
  assert.ok(registros.length >= prohibidos);
  assert.ok(registros.every((r) => r.startsWith('[autorizacion] 403') && !/Bearer|Authorization/i.test(r)));
  assert.ok(registros.every((r) => !Object.keys(USUARIOS).some((token) => r.includes(`usuario=${token}`))));
});

test('exportación por planograma: cuerpo > 512 kb → 413 con la forma de error estándar', async () => {
  const cuerpo = JSON.stringify({ versionIds: [1], formato: 'LISTA', posicionIds: Array.from({ length: 90000 }, (_, i) => i + 1) });
  const res = await fetch(`${base}/implementacion/productos/exportar`, {
    method: 'POST', headers: { Authorization: 'Bearer analista', 'Content-Type': 'application/json' }, body: cuerpo,
  });
  assert.equal(res.status, 413);
  const json = await res.json();
  assert.ok(json.error.code && json.error.message);
});
