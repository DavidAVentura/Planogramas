// S-03: ninguna ruta puede quedar sin regla de autorización (excepción: auth.routes.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '../../src/infrastructure/http/routes');
const EXCEPCIONES = ['auth.routes.js'];
const conRegla = (capa) => capa.handle?.reglaAutorizacion !== undefined;

// Un guard de router solo protege si es una capa `use` sin prefijo registrada ANTES de la ruta.
const esGuardRaiz = (capa) => !capa.route && conRegla(capa) && capa.slash === true;

// Devuelve las rutas del router sin regla de autorización efectiva.
function rutasDesprotegidas(router) {
  const huecos = [];
  router.stack.forEach((capa, i) => {
    if (!capa.route) return;
    const guardPrevio = router.stack.slice(0, i).some(esGuardRaiz);
    if (!guardPrevio && !capa.route.stack.some(conRegla)) {
      huecos.push(`${Object.keys(capa.route.methods)} ${capa.route.path}`);
    }
  });
  return huecos;
}

for (const archivo of fs.readdirSync(DIR).filter((f) => f.endsWith('.routes.js') && !EXCEPCIONES.includes(f))) {
  test(`${archivo}: toda ruta tiene regla de autorización`, () => {
    const router = require(path.join(DIR, archivo));
    assert.deepEqual(rutasDesprotegidas(router), [], `${archivo}: rutas sin regla de autorización`);
  });
}

// Casos negativos: la propia prueba debe detectar guards mal ubicados.
const { Router } = require('express');
const { requiereAnalista } = require('../../src/infrastructure/http/middlewares/autorizacion');
const handler = (req, res) => res.end();

test('detecta un guard de router puesto después de la ruta', () => {
  const r = Router();
  r.get('/x', handler);
  r.use(requiereAnalista);
  assert.deepEqual(rutasDesprotegidas(r), ['get /x']);
});

test('detecta un guard de router con prefijo', () => {
  const r = Router();
  r.use('/sub', requiereAnalista);
  r.get('/x', handler);
  assert.deepEqual(rutasDesprotegidas(r), ['get /x']);
});

test('acepta guard sin prefijo antes de la ruta y guard por ruta', () => {
  const a = Router();
  a.use(requiereAnalista);
  a.get('/x', handler);
  const b = Router();
  b.get('/y', requiereAnalista, handler);
  assert.deepEqual(rutasDesprotegidas(a), []);
  assert.deepEqual(rutasDesprotegidas(b), []);
});

test('routes/index.js no tiene un guard de autorización sin prefijo', () => {
  const raiz = require(path.join(DIR, 'index.js'));
  assert.ok(!raiz.stack.some((capa) => !capa.route && conRegla(capa)));
});
