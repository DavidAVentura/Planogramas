/**
 * Pruebas de los casos de uso del Consolidado Tiendas con repositorio, catálogo y generador falsos.
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

const { listarConsolidado, obtenerFiltros, exportarConsolidado } = require('../../src/domain/consolidado/consolidado.usecases');
const { crearSemaforo } = require('../../src/application/consolidado/semaforo');

function posicion(id, nivelId, sku, extra = {}) {
  return {
    id, nivelId, ordenHorizontal: id, sku, nombre: null, facings: 1, capacidadMaxima: 6, minFinal: 2, maxFinal: 6,
    ganchos: null, modo: 'PLANOGRAMA', cantidadApilable: 1, capacidadFacing: 3, minEstetico: 2, perfil: 'MRP',
    decision: 'ACTIVO', observaciones: null, crossExterno: false, montarEnDisplay: false, desbordaGondola: false,
    notaDesborde: null, ...extra,
  };
}

function baseFalsa({ posiciones, estadoV2 = 'publicado' } = {}) {
  return {
    versiones: [
      { versionId: 1, codigo: 'AAA-TG', estado: 'publicado', planogramaId: 10, planogramaNombre: 'A' },
      { versionId: 2, codigo: 'BBB-TG', estado: estadoV2, planogramaId: 20, planogramaNombre: 'B' },
    ],
    asignaciones: [{ versionId: 1, tiendaId: 1 }, { versionId: 2, tiendaId: 1 }],
    tiendas: [{ id: 1, codigo: '101', nombre: 'T1', tipo: 'GRANDE', marca: null }],
    gondolas: [
      { id: 1, versionId: 1, nombre: 'G1', orden: 1, anchoCm: 100, altoCm: 200, porUbicar: false },
      { id: 2, versionId: 2, nombre: 'G2', orden: 1, anchoCm: 100, altoCm: 200, porUbicar: false },
    ],
    secciones: [],
    niveles: [{ id: 1, gondolaId: 1, seccionId: null, orden: 1 }, { id: 2, gondolaId: 2, seccionId: null, orden: 1 }],
    posiciones: posiciones ?? [posicion(1, 1, 'S1'), posicion(2, 2, 'S1'), posicion(3, 1, 'S2', { modo: 'CROSS' })],
    accesorios: [],
    productos: [{ sku: 'S1', nombre: 'Uno', marca: null, skuSustituto: null, nombreSustituto: null }],
  };
}

function repoFalso(t, base = baseFalsa()) {
  return { cargarBase: t.mock.fn(async () => base), filtrosDisponibles: t.mock.fn(async () => ({ tiendas: [], versiones: [] })) };
}

function catalogoFalso(t, skus = ['S1']) {
  return { listarSkusPorJerarquia: t.mock.fn(async () => skus) };
}

const PARAMS = { vista: 'PLANOGRAMA', page: 1, pageSize: 50, orden: 'sku', direccion: 'asc' };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

describe('listarConsolidado', () => {
  it('devuelve datos paginados y el resumen; sin jerarquía no llama al catálogo', async (t) => {
    const repo = repoFalso(t); const catalogo = catalogoFalso(t);
    const r = await listarConsolidado({ repo, catalogo, maximoExportacion: 100000 }, {}, PARAMS);
    assert.equal(r.total, 2);
    assert.equal(r.data[0].planogramasEnTienda, 2);
    assert.equal(r.resumen.maximoExportacion, 100000);
    assert.equal(r.resumen.conteos.AGREGADO, 2);
    assert.equal(catalogo.listarSkusPorJerarquia.mock.callCount(), 0);
    assert.deepEqual(repo.cargarBase.mock.calls[0].arguments[0], { tiendaIds: [] });
  });

  it('con jerarquía filtra por los SKUs de CATI y los resuelve antes de cargar la base', async (t) => {
    const repo = repoFalso(t); const catalogo = catalogoFalso(t, ['S2']);
    const r = await listarConsolidado({ repo, catalogo, maximoExportacion: 10 }, { familia: 'F1', area: 'A1' }, PARAMS);
    assert.deepEqual(r.data.map((g) => g.sku), ['S2']);
    assert.deepEqual(catalogo.listarSkusPorJerarquia.mock.calls[0].arguments, ['familia', 'F1']);
  });

  it('CATI caído (503): se propaga y no se carga la base', async (t) => {
    const repo = repoFalso(t);
    const err = Object.assign(new Error('CATI'), { status: 503, code: 'SERVICIO_NO_DISPONIBLE' });
    const catalogo = { listarSkusPorJerarquia: async () => { throw err; } };
    await assert.rejects(listarConsolidado({ repo, catalogo, maximoExportacion: 10 }, { area: 'A' }, PARAMS), (e) => e === err);
    assert.equal(repo.cargarBase.mock.callCount(), 0);
  });

  it('una versión borrador en la base no aparece en el listado ni con versionIds', async (t) => {
    const repo = repoFalso(t, baseFalsa({ estadoV2: 'borrador' }));
    const r = await listarConsolidado({ repo, catalogo: catalogoFalso(t), maximoExportacion: 10 }, {}, PARAMS);
    assert.equal(r.data.find((g) => g.sku === 'S1').planograma.length, 1);
    const solo = await listarConsolidado({ repo, catalogo: catalogoFalso(t), maximoExportacion: 10 }, { versionIds: [2] }, PARAMS);
    assert.equal(solo.total, 0);
  });

  it('vista CROSS cuenta filas', async (t) => {
    const r = await listarConsolidado({ repo: repoFalso(t), catalogo: catalogoFalso(t), maximoExportacion: 10 }, {}, { ...PARAMS, vista: 'CROSS' });
    assert.equal(r.total, 1);
    assert.deepEqual(r.data[0].planograma, []);
  });
});

describe('obtenerFiltros', () => {
  it('delega en el repositorio', async (t) => {
    const repo = repoFalso(t);
    assert.deepEqual(await obtenerFiltros({ repo }), { tiendas: [], versiones: [] });
  });
});

describe('exportarConsolidado', () => {
  const OPC = { formato: 'DETALLADO', hojas: undefined, columnas: ['sku', 'modo'] };

  function deps(t, extra = {}) {
    return {
      repo: repoFalso(t), catalogo: catalogoFalso(t),
      escribirLibro: t.mock.fn(async () => Buffer.from('xlsx')),
      semaforo: crearSemaforo(1), maximoFilas: 100, ...extra,
    };
  }

  it('genera el buffer con las filas del archivo', async (t) => {
    const d = deps(t);
    const r = await exportarConsolidado(d, {}, OPC);
    assert.equal(r.filas, 3);
    assert.equal(r.buffer.toString(), 'xlsx');
    const [hojas] = d.escribirLibro.mock.calls[0].arguments;
    assert.deepEqual(hojas[0].encabezados, ['SKU', 'Modo']);
  });

  it('sobre el tope → 422 con details y sin llamar al generador', async (t) => {
    const d = deps(t, { maximoFilas: 2 });
    await assert.rejects(exportarConsolidado(d, {}, OPC), (e) => {
      assert.equal(e.status, 422);
      assert.equal(e.code, 'EXPORTACION_DEMASIADO_GRANDE');
      assert.deepEqual(e.details, { filas: 3, maximo: 2 });
      return true;
    });
    assert.equal(d.escribirLibro.mock.callCount(), 0);
  });

  it('con jerarquía y CATI caído → error propagado y sin cargar la base', async (t) => {
    const err = Object.assign(new Error('CATI'), { status: 503, code: 'SERVICIO_NO_DISPONIBLE' });
    const d = deps(t, { catalogo: { listarSkusPorJerarquia: async () => { throw err; } } });
    await assert.rejects(exportarConsolidado(d, { area: 'A' }, OPC), (e) => e === err);
    assert.equal(d.repo.cargarBase.mock.callCount(), 0);
    assert.equal(d.escribirLibro.mock.callCount(), 0);
  });

  it('dos exportaciones concurrentes: la segunda 503; al terminar la primera, otra pasa', async (t) => {
    const d = deps(t, { escribirLibro: async () => { await esperar(40); return Buffer.from('x'); } });
    const primera = exportarConsolidado(d, {}, OPC);
    await esperar(5);
    await assert.rejects(exportarConsolidado(d, {}, OPC), (e) => {
      assert.equal(e.status, 503);
      assert.equal(e.code, 'EXPORTACION_EN_CURSO');
      assert.equal(e.message, 'Hay otra descarga en curso. Inténtalo en unos segundos.');
      return true;
    });
    await primera;
    await assert.doesNotReject(exportarConsolidado(d, {}, OPC));
  });

  it('si el generador lanza, el semáforo se libera', async (t) => {
    const semaforo = crearSemaforo(1);
    const d = deps(t, { semaforo, escribirLibro: async () => { throw new Error('boom'); } });
    await assert.rejects(exportarConsolidado(d, {}, OPC), /boom/);
    assert.equal(semaforo.intentarTomar(), true);
  });

  it('una versión borrador no aparece en la exportación', async (t) => {
    const d = deps(t, { repo: repoFalso(t, baseFalsa({ estadoV2: 'borrador' })) });
    const r = await exportarConsolidado(d, {}, OPC);
    assert.equal(r.filas, 2);
  });
});

describe('semáforo', () => {
  it('respeta el máximo y libera', () => {
    const s = crearSemaforo(2);
    assert.equal(s.intentarTomar(), true);
    assert.equal(s.intentarTomar(), true);
    assert.equal(s.intentarTomar(), false);
    s.liberar();
    assert.equal(s.intentarTomar(), true);
    s.liberar(); s.liberar(); s.liberar();
    assert.equal(s.intentarTomar(), true);
  });
});
