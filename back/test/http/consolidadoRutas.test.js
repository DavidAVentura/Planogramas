/**
 * Pruebas HTTP del módulo 21 (Consolidado Tiendas): autorización de las 3 rutas y comportamiento
 * del controller con dependencias falsas.
 */

const { describe, it, after } = require('node:test');
const assert                  = require('node:assert/strict');
const express                 = require('express');

const router = require('../../src/infrastructure/http/routes/consolidado.routes');
const errorHandler = require('../../src/infrastructure/http/middlewares/errorHandler');
const { requiereAnalista } = require('../../src/infrastructure/http/middlewares/autorizacion');
const { crearControllerConsolidado } = require('../../src/application/consolidado/consolidado.controller');
const { crearSemaforo } = require('../../src/application/compartido/semaforo');

const rango = (hasta) => Array.from({ length: hasta }, (_, i) => `PLA${String(i + 1).padStart(3, '0')}`);
const analista = Object.freeze({ numeroEmpleado: '1', permisos: Object.freeze(rango(10)) });
const tienda   = Object.freeze({ numeroEmpleado: '2', permisos: Object.freeze(['PLA009', 'PLA010']) });

describe('autorización de las rutas del consolidado', () => {
  const rutas = router.stack.filter((capa) => capa.route).map((capa) => capa.route.path);
  const guard = router.stack.find((capa) => !capa.route && capa.slash === true);

  it('expone las 3 rutas y el guard A va antes que todas', () => {
    assert.deepEqual(rutas.sort(), ['/tiendas', '/tiendas/exportar', '/tiendas/filtros']);
    assert.equal(guard.handle, requiereAnalista);
    assert.equal(router.stack.indexOf(guard), 0);
  });

  it('PLA009/PLA010 → 403; sin usuario → 401; analista pasa', (t) => {
    t.mock.method(console, 'warn', () => {});
    const correr = (usuario) => {
      let error;
      guard.handle({ usuario, method: 'GET', baseUrl: '/consolidado', path: '/tiendas' }, {}, (e) => { error = e; });
      return error;
    };
    assert.equal(correr(tienda).status, 403);
    assert.equal(correr(undefined).status, 401);
    assert.equal(correr(analista), undefined);
  });

  it('exportar y listar llevan su limitador por usuario', () => {
    const nombres = (ruta) => router.stack.find((c) => c.route?.path === ruta).route.stack.map((l) => l.name);
    // validación de la query → limitador → controller
    assert.equal(nombres('/tiendas/exportar').length, 3);
    assert.equal(nombres('/tiendas').length, 3);
    assert.equal(nombres('/tiendas/filtros').length, 1);
  });
});

describe('controller del consolidado', () => {
  const baseVacia = {
    versiones: [], asignaciones: [], tiendas: [], gondolas: [], secciones: [], niveles: [], posiciones: [], accesorios: [], productos: [],
  };

  function levantar(extra = {}) {
    const controller = crearControllerConsolidado({
      repo: { cargarBase: async () => baseVacia, filtrosDisponibles: async () => ({ tiendas: [], versiones: [] }) },
      catalogo: { listarSkusPorJerarquia: async () => [] },
      escribirLibro: async () => Buffer.from('PK-falso'),
      semaforo: crearSemaforo(1),
      maximoFilas: 1000,
      ahora: () => new Date(2026, 9, 15),
      ...extra,
    });
    const app = express();
    app.use((req, _res, next) => { req.usuario = analista; next(); });
    app.get('/filtros', controller.filtros);
    app.get('/exportar', controller.exportar);
    app.get('/listar', controller.listar);
    app.use(errorHandler);
    const servidor = app.listen(0);
    after(() => servidor.close());
    return (ruta) => fetch(`http://127.0.0.1:${servidor.address().port}${ruta}`);
  }

  it('listar responde la forma paginada con resumen', async (t) => {
    t.mock.method(console, 'info', () => {});
    const r = await levantar()('/listar?pageSize=25');
    assert.equal(r.status, 200);
    const cuerpo = await r.json();
    assert.deepEqual(Object.keys(cuerpo), ['data', 'total', 'page', 'pageSize', 'resumen']);
    assert.equal(cuerpo.pageSize, 25);
    assert.equal(cuerpo.resumen.maximoExportacion, 1000);
  });

  it('parámetro desconocido o repetido → 400 con la forma de error', async () => {
    const pedir = levantar();
    for (const url of ['/listar?foo=1', '/listar?tiendaIds=1&tiendaIds=2', '/filtros?x=1']) {
      const r = await pedir(url);
      assert.equal(r.status, 400, url);
      assert.equal((await r.json()).error.code, 'VALIDATION_ERROR');
    }
  });

  it('exportar 200 con tipo, nombre con fecha, no-store y longitud', async (t) => {
    t.mock.method(console, 'info', () => {});
    const r = await levantar()('/exportar?formato=AGREGADO&columnas=sku,tienda');
    assert.equal(r.status, 200);
    assert.equal(r.headers.get('content-type'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    assert.equal(r.headers.get('content-disposition'), 'attachment; filename="consolidado-tiendas-minmax-20261015.xlsx"');
    assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.equal(r.headers.get('content-length'), String(Buffer.from('PK-falso').length));
    assert.equal(Buffer.from(await r.arrayBuffer()).toString(), 'PK-falso');
  });

  it('exportar con columnas fuera de la lista blanca → 400 con columnasInvalidas', async () => {
    const r = await levantar()('/exportar?formato=DETALLADO&columnas=sku,__proto__');
    assert.equal(r.status, 400);
    assert.deepEqual((await r.json()).error.details, { columnasInvalidas: ['__proto__'] });
  });

  it('si el generador lanza → 500 INTERNAL_ERROR en JSON, sin stack ni cabeceras de xlsx', async (t) => {
    t.mock.method(console, 'error', () => {});
    const r = await levantar({ escribirLibro: async () => { throw new Error('boom interno'); } })('/exportar?formato=DETALLADO&columnas=sku');
    assert.equal(r.status, 500);
    assert.match(r.headers.get('content-type'), /application\/json/);
    assert.equal(r.headers.get('content-disposition'), null);
    const texto = await r.text();
    assert.equal(JSON.parse(texto).error.code, 'INTERNAL_ERROR');
    assert.ok(!texto.includes('stack') && !texto.includes('at '));
  });

  it('tope de filas → 422 EXPORTACION_DEMASIADO_GRANDE', async (t) => {
    t.mock.method(console, 'info', () => {});
    const base = {
      ...baseVacia,
      versiones: [{ versionId: 1, codigo: 'A', estado: 'publicado', planogramaId: 1, planogramaNombre: 'P' }],
      asignaciones: [{ versionId: 1, tiendaId: 1 }],
      tiendas: [{ id: 1, codigo: '1', nombre: 'T', tipo: 'GRANDE', marca: null }],
      gondolas: [{ id: 1, versionId: 1, nombre: 'G', orden: 1, anchoCm: 1, altoCm: 1, porUbicar: false }],
      niveles: [{ id: 1, gondolaId: 1, seccionId: null, orden: 1 }],
      posiciones: [{ id: 1, nivelId: 1, ordenHorizontal: 1, sku: 'S', facings: 1, modo: 'PLANOGRAMA' }],
    };
    const r = await levantar({ repo: { cargarBase: async () => base }, maximoFilas: 0 })('/exportar?formato=DETALLADO&columnas=sku');
    assert.equal(r.status, 422);
    const cuerpo = await r.json();
    assert.equal(cuerpo.error.code, 'EXPORTACION_DEMASIADO_GRANDE');
    assert.deepEqual(cuerpo.error.details, { filas: 1, maximo: 0 });
  });
});
