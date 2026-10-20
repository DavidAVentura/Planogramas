/**
 * Pruebas HTTP de POST /implementacion/productos/exportar: orden de middlewares de la ruta y
 * comportamiento del controller con dependencias falsas (cabeceras solo con Buffer, errores en JSON).
 */

const { describe, it, after } = require('node:test');
const assert                  = require('node:assert/strict');
const express                 = require('express');

const router = require('../../src/infrastructure/http/routes/implementacion.routes');
const errorHandler = require('../../src/infrastructure/http/middlewares/errorHandler');
const { requiereAnalista } = require('../../src/infrastructure/http/middlewares/autorizacion');
const { crearControllerExportacion } = require('../../src/application/implementacion/implementacion.controller');
const { crearSemaforo } = require('../../src/application/compartido/semaforo');

const analista = Object.freeze({ numeroEmpleado: '1' });

describe('ruta POST /productos/exportar', () => {
  const guard = router.stack.find((capa) => !capa.route && capa.slash === true);
  const capaExportar = router.stack.find((c) => c.route?.path === '/productos/exportar');

  it('el guard del analista va antes que todas las rutas', () => {
    assert.equal(guard.handle, requiereAnalista);
    assert.equal(router.stack.indexOf(guard), 0);
  });

  it('solo POST, con validación del cuerpo → limitador → controller', () => {
    assert.deepEqual(Object.keys(capaExportar.route.methods), ['post']);
    assert.equal(capaExportar.route.stack.length, 3);
  });

  it('el listado también lleva limitador (limitador → controller)', () => {
    assert.equal(router.stack.find((c) => c.route?.path === '/productos').route.stack.length, 2);
  });
});

describe('controller de la exportación por planograma', () => {
  const versiones = [{
    versionId: 1, codigo: 'A-TG', tipo: 'GRANDE', estado: 'publicado', esEspecial: false, planogramaId: 10, nombre: 'Ferretería',
  }];
  const baseVacia = { gondolas: [], secciones: [], niveles: [], posiciones: [], accesorios: [], productos: [] };

  function levantar(extra = {}) {
    const controller = crearControllerExportacion({
      repo: { listarVersiones: async () => versiones, cargarBaseVersiones: async () => baseVacia },
      catalogo: { obtenerAreas: async () => [], obtenerDepartamentos: async () => [], listarSkusPorJerarquia: async () => [] },
      escribirLibro: async () => Buffer.from('PK-falso'),
      semaforo: crearSemaforo(1),
      maximoFilas: 1000,
      ahora: () => new Date(2026, 9, 19),
      ...extra,
    });
    const app = express();
    app.use((req, _res, next) => { req.usuario = analista; next(); });
    app.post('/exportar', express.json({ limit: '512kb' }), controller.exportar);
    app.use(errorHandler);
    const servidor = app.listen(0);
    after(() => servidor.close());
    return (cuerpo, crudo) => fetch(`http://127.0.0.1:${servidor.address().port}/exportar`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: crudo ?? JSON.stringify(cuerpo),
    });
  }

  it('200 con tipo, nombre con fecha, no-store y longitud; el log no lleva ids ni jerarquía', async (t) => {
    const info = t.mock.method(console, 'info', () => {});
    const r = await levantar()({ versionIds: [1], formato: 'LISTA' });
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.equal(r.headers.get('content-disposition'), 'attachment; filename="productos-por-planograma-lista-20261019.xlsx"');
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(r.headers.get('content-length'), String(Buffer.from('PK-falso').length));
    assert.equal(Buffer.from(await r.arrayBuffer()).toString(), 'PK-falso');
    const registro = info.mock.calls[0].arguments[0];
    assert.match(registro, /^\[implementacion\] exportacion numeroEmpleado=1 formato=LISTA versiones=1 filtroCliente=no filas=0 ms=\d+$/);
  });

  it('con posicionIds el log marca filtroCliente=si', async (t) => {
    const info = t.mock.method(console, 'info', () => {});
    await levantar()({ versionIds: [1], formato: 'PIVOTE', posicionIds: [5] });
    assert.match(info.mock.calls[0].arguments[0], /formato=PIVOTE .* filtroCliente=si /);
  });

  it('cuerpo inválido → 400 con la forma de error y sin cabeceras de xlsx', async () => {
    for (const cuerpo of [{}, { versionIds: [1], formato: 'CSV' }, { versionIds: [1], formato: 'LISTA', foo: 1 }]) {
      const r = await levantar()(cuerpo);
      assert.equal(r.status, 400);
      assert.equal(r.headers.get('content-disposition'), null);
      assert.equal((await r.json()).error.code, 'VALIDATION_ERROR');
    }
  });

  it('JSON mal formado → 400', async () => {
    const r = await levantar()(null, '{"versionIds": [');
    assert.equal(r.status, 400);
  });

  it('cuerpo mayor de 512 kb → 413 con la forma de error estándar', async () => {
    const r = await levantar()({ versionIds: [1], formato: 'LISTA', posicionIds: Array.from({ length: 90000 }, (_, i) => i + 1) });
    assert.equal(r.status, 413);
    const cuerpo = await r.json();
    assert.ok(cuerpo.error.code && cuerpo.error.message);
  });

  it('si el generador lanza → 500 INTERNAL_ERROR en JSON, sin stack ni Content-Disposition', async (t) => {
    t.mock.method(console, 'error', () => {});
    const r = await levantar({ escribirLibro: async () => { throw new Error('boom interno'); } })({ versionIds: [1], formato: 'LISTA' });
    assert.equal(r.status, 500);
    assert.match(r.headers.get('content-type'), /application\/json/);
    assert.equal(r.headers.get('content-disposition'), null);
    const texto = await r.text();
    assert.equal(JSON.parse(texto).error.code, 'INTERNAL_ERROR');
    assert.ok(!texto.includes('stack') && !texto.includes('at '));
  });

  it('versión inexistente → 404; Pivote no aplicable → 422 con details; tope → 422', async () => {
    const r404 = await levantar()({ versionIds: [1, 99], formato: 'LISTA' });
    assert.equal(r404.status, 404);
    assert.deepEqual((await r404.json()).error.details, { versionIds: [99] });

    const repo = { listarVersiones: async () => [{ ...versiones[0], tipo: null }], cargarBaseVersiones: async () => baseVacia };
    const r422 = await levantar({ repo })({ versionIds: [1], formato: 'PIVOTE' });
    assert.equal(r422.status, 422);
    const cuerpo = await r422.json();
    assert.equal(cuerpo.error.code, 'PIVOTE_NO_APLICABLE');
    assert.deepEqual(cuerpo.error.details, { sinTipo: [1], duplicadas: [], soloEspeciales: false });

    const base = {
      ...baseVacia,
      gondolas: [{ id: 1, versionId: 1, nombre: 'G', orden: 1, anchoCm: 1, altoCm: 1, porUbicar: false }],
      niveles: [{ id: 1, gondolaId: 1, seccionId: null, orden: 1 }],
      posiciones: [{ id: 1, nivelId: 1, ordenHorizontal: 1, sku: 'S', facings: 1, modo: 'PLANOGRAMA' }],
    };
    const rTope = await levantar({ repo: { listarVersiones: async () => versiones, cargarBaseVersiones: async () => base }, maximoFilas: 0 })({ versionIds: [1], formato: 'LISTA' });
    assert.equal(rTope.status, 422);
    assert.deepEqual((await rTope.json()).error.details, { filas: 1, maximo: 0 });
  });
});
