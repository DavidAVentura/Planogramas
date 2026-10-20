/**
 * Pruebas de los limitadores por usuario del consolidado: cada empleado tiene su propio cupo.
 */

const { describe, it, after } = require('node:test');
const assert                  = require('node:assert/strict');
const express                 = require('express');

const {
  exportacionLimiter, consolidadoLimiter, exportacionPorVersionLimiter, productosPorVersionLimiter,
} = require('../../src/infrastructure/http/middlewares/rateLimit');

function crearApp() {
  const app = express();
  app.use((req, _res, next) => { req.usuario = { numeroEmpleado: req.get('x-empleado') }; next(); });
  app.get('/exportar', exportacionLimiter, (_req, res) => res.json({ ok: true }));
  // Misma disposición que consolidado.routes: validación antes del limitador.
  const rechazaX = (req, res, next) => (req.query.x ? res.status(400).json({ error: { code: 'VALIDATION_ERROR' } }) : next());
  app.get('/invalida', rechazaX, exportacionLimiter, (_req, res) => res.json({ ok: true }));
  // Comparte el limitador de exportación (clave por usuario) con un handler lento.
  app.get('/lenta', exportacionLimiter, (_req, res) => setTimeout(() => res.json({ ok: true }), 300));
  app.get('/listar', consolidadoLimiter, (_req, res) => res.json({ ok: true }));
  app.get('/por-version/exportar', exportacionPorVersionLimiter, (_req, res) => res.json({ ok: true }));
  app.get('/por-version/listar', productosPorVersionLimiter, (_req, res) => res.json({ ok: true }));
  return app;
}

describe('limitadores por usuario', () => {
  const servidor = crearApp().listen(0);
  const base = () => `http://127.0.0.1:${servidor.address().port}`;
  const pedir = (ruta, empleado) => fetch(`${base()}${ruta}`, { headers: { 'x-empleado': empleado } });
  after(() => servidor.close());

  it('exportación: la 6.ª del mismo usuario → 429; otro usuario → 200', async () => {
    for (let i = 0; i < 5; i += 1) assert.equal((await pedir('/exportar', 'A')).status, 200);
    const sexta = await pedir('/exportar', 'A');
    assert.equal(sexta.status, 429);
    const cuerpo = await sexta.json();
    assert.equal(cuerpo.error.code, 'RATE_LIMITED');
    assert.match(cuerpo.error.message, /descargas/);
    assert.equal((await pedir('/exportar', 'B')).status, 200);
  });

  it('listado: la 61.ª del mismo usuario → 429', async () => {
    for (let i = 0; i < 60; i += 1) assert.equal((await pedir('/listar', 'C')).status, 200);
    assert.equal((await pedir('/listar', 'C')).status, 429);
    assert.equal((await pedir('/listar', 'D')).status, 200);
  });

  it('productos por planograma: la descarga (5/min) y el listado (60/min) tienen su propio cupo por usuario', async () => {
    for (let i = 0; i < 5; i += 1) assert.equal((await pedir('/por-version/exportar', 'G')).status, 200);
    assert.equal((await pedir('/por-version/exportar', 'G')).status, 429);
    // cupo aparte del consolidado y del listado
    assert.equal((await pedir('/exportar', 'G')).status, 200);
    assert.equal((await pedir('/por-version/listar', 'G')).status, 200);
    assert.equal((await pedir('/por-version/exportar', 'H')).status, 200);

    for (let i = 0; i < 60; i += 1) assert.equal((await pedir('/por-version/listar', 'I')).status, 200);
    assert.equal((await pedir('/por-version/listar', 'I')).status, 429);
    assert.equal((await pedir('/por-version/listar', 'J')).status, 200);
  });

  it('las peticiones inválidas (400, validadas antes del limitador) no gastan cupo', async () => {
    for (let i = 0; i < 8; i += 1) assert.equal((await pedir('/invalida?x=1', 'E')).status, 400);
    assert.equal((await pedir('/exportar', 'E')).status, 200);
  });

  it('abortar la petición no devuelve el cupo: la 6.ª responde 429', async () => {
    const abortadas = Array.from({ length: 5 }, async () => {
      const control = new AbortController();
      const peticion = fetch(`${base()}/lenta`, { headers: { 'x-empleado': 'F' }, signal: control.signal });
      setTimeout(() => control.abort(), 30);
      await peticion.catch(() => {});
    });
    await Promise.all(abortadas);
    await new Promise((r) => setTimeout(r, 400)); // deja terminar los handlers lentos
    assert.equal((await pedir('/exportar', 'F')).status, 429);
  });
});
