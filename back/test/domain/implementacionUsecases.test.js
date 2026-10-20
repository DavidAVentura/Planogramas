/**
 * Pruebas de los casos de uso Por versión (CU-10-05 consulta con jerarquía, CU-10-06 descarga) con
 * repositorio, catálogo (CATI) y generador del libro falsos.
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

const {
  obtenerProductosPorVersion, resolverJerarquia, exportarProductosPorVersion,
} = require('../../src/domain/implementacion/implementacion.usecases');
const { crearSemaforo, semaforoExportacion } = require('../../src/application/compartido/semaforo');

// ─── Fixtures ────────────────────────────────────────────────────────────────

const versionBd = (versionId, codigo, tipo, estado, extra = {}) => ({
  versionId, codigo, tipo, estado, esEspecial: false, planogramaId: 10, nombre: 'Ferretería', descripcion: null, departamento: 'D', ...extra,
});

function posicionBase(id, nivelId, sku, extra = {}) {
  return {
    id, nivelId, ordenHorizontal: id, sku, nombre: null, facings: 1, capacidadMaxima: 6, minFinal: 2, maxFinal: 6,
    ganchos: null, modo: 'PLANOGRAMA', cantidadApilable: 1, capacidadFacing: 3, minEstetico: 2, perfil: 'MRP',
    decision: 'ACTIVO', observaciones: null, crossExterno: false, montarEnDisplay: false, desbordaGondola: false,
    notaDesborde: null, ...extra,
  };
}

/** Base de exportación: versiones 1 (TG publicado) y 2 (TG piloto), un nivel por versión (id = versionId). */
function baseExportacion(posiciones) {
  return {
    gondolas: [1, 2].map((id) => ({ id, versionId: id, nombre: `G${id}`, orden: 1, anchoCm: 100, altoCm: 200, porUbicar: false })),
    secciones: [],
    niveles: [1, 2].map((id) => ({ id, gondolaId: id, seccionId: null, orden: 1 })),
    posiciones: posiciones ?? [posicionBase(1, 1, 'S1'), posicionBase(2, 1, 'S2'), posicionBase(3, 2, 'S1')],
    accesorios: [],
    productos: [
      { sku: 'S1', nombre: 'Uno', marca: null, area: 'A1', departamento: 'D1', skuSustituto: null, nombreSustituto: null },
      { sku: 'S2', nombre: 'Dos', marca: null, area: 'A2', departamento: 'D2', skuSustituto: null, nombreSustituto: null },
    ],
  };
}

const VERSIONES = [versionBd(1, 'A-TG', 'GRANDE', 'publicado'), versionBd(2, 'A-TG-P', 'GRANDE', 'piloto')];

function repoFalso(t, { versiones = VERSIONES, base = baseExportacion() } = {}) {
  return {
    listarVersiones: t.mock.fn(async ({ incluirIds }) => versiones.filter((v) => incluirIds.includes(v.versionId))),
    cargarBaseVersiones: t.mock.fn(async () => base),
  };
}

const AREAS = [{ id: 'A1', name: 'Área 1' }, { id: 'A2', name: 'Área 2' }];
const DEPARTAMENTOS = { A1: [{ id: 'D1', name: 'Dep 1' }], A2: [{ id: 'D2', name: 'Dep 2' }] };

function catalogoFalso(t, skus = ['S1']) {
  return {
    obtenerAreas: t.mock.fn(async () => AREAS),
    obtenerDepartamentos: t.mock.fn(async (area) => DEPARTAMENTOS[area] ?? []),
    listarSkusPorJerarquia: t.mock.fn(async () => skus),
  };
}

const libroFalso = (t) => t.mock.fn(async (hojas) => Buffer.from(JSON.stringify(hojas.map((h) => h.nombre))));

function deps(t, extra = {}) {
  return {
    repo: repoFalso(t), catalogo: catalogoFalso(t), escribirLibro: libroFalso(t),
    semaforo: crearSemaforo(1), maximoFilas: 1000, ahora: () => new Date(2026, 9, 19), ...extra,
  };
}

const PETICION = { versionIds: [1, 2], formato: 'LISTA' };
const errorCati = Object.assign(new Error('CATI'), { status: 503, code: 'SERVICE_UNAVAILABLE' });

// ─── resolverJerarquia ───────────────────────────────────────────────────────

describe('resolverJerarquia', () => {
  it('sin jerarquía → null y no llama a CATI', async (t) => {
    const catalogo = catalogoFalso(t);
    assert.equal(await resolverJerarquia(catalogo, {}), null);
    assert.equal(catalogo.obtenerAreas.mock.callCount() + catalogo.listarSkusPorJerarquia.mock.callCount(), 0);
  });

  it('área existente → SKU del nivel área', async (t) => {
    const catalogo = catalogoFalso(t, ['S1', 'S5']);
    const skus = await resolverJerarquia(catalogo, { area: 'A1' });
    assert.deepEqual([...skus], ['S1', 'S5']);
    assert.deepEqual(catalogo.listarSkusPorJerarquia.mock.calls[0].arguments, ['area', 'A1']);
    assert.equal(catalogo.obtenerDepartamentos.mock.callCount(), 0);
  });

  it('con departamento usa el nivel más específico', async (t) => {
    const catalogo = catalogoFalso(t);
    await resolverJerarquia(catalogo, { area: 'A1', departamento: 'D1' });
    assert.deepEqual(catalogo.listarSkusPorJerarquia.mock.calls[0].arguments, ['departamento', 'D1']);
  });

  it('área inexistente → 400 y no pide los SKU', async (t) => {
    const catalogo = catalogoFalso(t);
    await assert.rejects(resolverJerarquia(catalogo, { area: '999' }), (e) => e.status === 400 && e.code === 'VALIDATION_ERROR');
    assert.equal(catalogo.listarSkusPorJerarquia.mock.callCount(), 0);
  });

  it('departamento de otra área → 400 y no pide los SKU', async (t) => {
    const catalogo = catalogoFalso(t);
    await assert.rejects(resolverJerarquia(catalogo, { area: 'A1', departamento: 'D2' }), (e) => e.status === 400);
    assert.equal(catalogo.listarSkusPorJerarquia.mock.callCount(), 0);
  });

  it('departamento sin área → 400 sin llamar a CATI', async (t) => {
    const catalogo = catalogoFalso(t);
    await assert.rejects(resolverJerarquia(catalogo, { departamento: 'D1' }), (e) => e.status === 400);
    assert.equal(catalogo.obtenerAreas.mock.callCount(), 0);
  });

  it('CATI caído → el error se propaga (503)', async () => {
    const catalogo = { obtenerAreas: async () => { throw errorCati; } };
    await assert.rejects(resolverJerarquia(catalogo, { area: 'A1' }), (e) => e === errorCati);
  });

  it('las llamadas a CATI no dependen del número de SKU (I3)', async (t) => {
    const pocos = catalogoFalso(t, ['S1']);
    const muchos = catalogoFalso(t, Array.from({ length: 5000 }, (_, i) => `S${i}`));
    await resolverJerarquia(pocos, { area: 'A1', departamento: 'D1' });
    await resolverJerarquia(muchos, { area: 'A1', departamento: 'D1' });
    const total = (c) => c.obtenerAreas.mock.callCount() + c.obtenerDepartamentos.mock.callCount() + c.listarSkusPorJerarquia.mock.callCount();
    assert.equal(total(pocos), 3);
    assert.equal(total(muchos), 3);
  });
});

// ─── obtenerProductosPorVersion con jerarquía ────────────────────────────────

describe('obtenerProductosPorVersion con jerarquía', () => {
  const fila = (posicionId, sku, versionId = 1) => ({ posicionId, versionId, sku, nombre: null });

  function repoListado(t) {
    return {
      buscarTienda: t.mock.fn(async () => ({ id: 5, codigo: '105', nombre: 'T', tipo: 'GRANDE', estado: 'activo' })),
      listarVersiones: t.mock.fn(async () => VERSIONES),
      listarSkusActivosPorVersion: t.mock.fn(async () => [{ versionId: 1, sku: 'S1' }, { versionId: 1, sku: 'S2' }]),
      contarAdjuntosPorVersion: t.mock.fn(async () => new Map()),
      listarTiendasPorVersion: t.mock.fn(async () => new Map()),
      listarGondolasConEvidencias: t.mock.fn(async () => []),
      listarPosicionesConProducto: t.mock.fn(async () => [fila(1, 'S1'), fila(2, 'S2'), fila(3, 'S1', 2)]),
    };
  }
  const sinInventario = { obtenerInventarioTienda: async () => ({ inventario: new Map(), actualizadoEn: null, desactualizado: false }) };

  it('sin jerarquía no llama a CATI y devuelve todas las filas', async (t) => {
    const catalogo = catalogoFalso(t);
    const r = await obtenerProductosPorVersion(repoListado(t), sinInventario, { versionIds: [1, 2] }, null, catalogo);
    assert.equal(r.total, 3);
    assert.equal(catalogo.obtenerAreas.mock.callCount(), 0);
  });

  it('con jerarquía: los SKU fuera del conjunto no aparecen, total === data.length y el resumen no se filtra', async (t) => {
    const r = await obtenerProductosPorVersion(repoListado(t), sinInventario, { versionIds: [1, 2], area: 'A1' }, null, catalogoFalso(t, ['S1']));
    assert.deepEqual(r.data.map((f) => f.sku), ['S1', 'S1']);
    assert.equal(r.total, r.data.length);
    assert.equal(r.versiones[0].totalProductos, 2); // el resumen sigue siendo el de la versión completa
  });

  it('el inventario se consulta con los SKU de la versión completa: el resumen no queda distorsionado', async (t) => {
    const consultados = [];
    const inventario = {
      obtenerInventarioTienda: async (_codigo, skus) => {
        consultados.push([...skus].sort());
        return { inventario: new Map([['S1', 4], ['S2', 4]]), actualizadoEn: null, desactualizado: false };
      },
    };
    const r = await obtenerProductosPorVersion(repoListado(t), inventario, { versionIds: [1, 2], tiendaId: 5, area: 'A1' }, null, catalogoFalso(t, ['S1']));
    assert.deepEqual(consultados, [['S1', 'S2']]);
    assert.equal(r.versiones[0].conInventario, 2);
    assert.deepEqual(r.data.map((f) => f.inventario), [4, 4]);
  });

  it('CATI caído → 503 y no se leen posiciones', async (t) => {
    const repo = repoListado(t);
    const catalogo = { obtenerAreas: async () => { throw errorCati; } };
    await assert.rejects(obtenerProductosPorVersion(repo, sinInventario, { versionIds: [1], area: 'A1' }, null, catalogo), (e) => e === errorCati);
    assert.equal(repo.listarPosicionesConProducto.mock.callCount(), 0);
  });

  it('área inexistente → 400 y no se piden los SKU ni se leen posiciones', async (t) => {
    const repo = repoListado(t); const catalogo = catalogoFalso(t);
    await assert.rejects(obtenerProductosPorVersion(repo, sinInventario, { versionIds: [1], area: '999' }, null, catalogo), (e) => e.status === 400);
    assert.equal(catalogo.listarSkusPorJerarquia.mock.callCount(), 0);
    assert.equal(repo.listarPosicionesConProducto.mock.callCount(), 0);
  });
});

// ─── exportarProductosPorVersion ─────────────────────────────────────────────

describe('exportarProductosPorVersion', () => {
  const nombresHojas = (escribirLibro) => escribirLibro.mock.calls[0].arguments[0].map((h) => h.nombre);
  const hojaPrincipal = (escribirLibro) => escribirLibro.mock.calls[0].arguments[0][0];

  it('Lista: hoja principal primero y hoja Versiones; nombre de archivo y filas', async (t) => {
    const d = deps(t);
    const r = await exportarProductosPorVersion(d, PETICION);
    assert.deepEqual(nombresHojas(d.escribirLibro), ['Lista', 'Versiones']);
    assert.equal(r.filas, 3);
    assert.equal(r.nombre, 'productos-por-planograma-lista-20261019.xlsx');
    assert.ok(Buffer.isBuffer(r.buffer));
    assert.equal(d.catalogo.obtenerAreas.mock.callCount(), 0);
  });

  it('Pivote: una fila por SKU–planograma–estado–modo', async (t) => {
    const d = deps(t);
    const r = await exportarProductosPorVersion(d, { ...PETICION, formato: 'PIVOTE' });
    assert.deepEqual(nombresHojas(d.escribirLibro), ['Pivote por versión', 'Versiones']);
    assert.equal(r.filas, 3); // S1 publicado, S2 publicado, S1 piloto
    assert.equal(r.nombre, 'productos-por-planograma-pivote-20261019.xlsx');
  });

  it('versión inexistente → 404 con details.versionIds y sin tomar el semáforo', async (t) => {
    const d = deps(t);
    await assert.rejects(exportarProductosPorVersion(d, { ...PETICION, versionIds: [1, 99] }), (e) => {
      assert.equal(e.status, 404);
      assert.deepEqual(e.details, { versionIds: [99] });
      return true;
    });
    assert.equal(d.semaforo.intentarTomar(), true);
  });

  it('Pivote con dos versiones del mismo planograma, tipo y estado → 422 antes de CATI y de la base', async (t) => {
    const versiones = [versionBd(1, 'A', 'GRANDE', 'borrador'), versionBd(2, 'B', 'GRANDE', 'borrador')];
    const d = deps(t, { repo: repoFalso(t, { versiones }) });
    await assert.rejects(exportarProductosPorVersion(d, { ...PETICION, formato: 'PIVOTE', area: 'A1' }), (e) => e.status === 422 && e.code === 'PIVOTE_NO_APLICABLE');
    assert.equal(d.catalogo.obtenerAreas.mock.callCount(), 0);
    assert.equal(d.repo.cargarBaseVersiones.mock.callCount(), 0);
  });

  it('Pivote con una especial: se excluye (no se carga) y la hoja Versiones la reporta', async (t) => {
    const versiones = [versionBd(1, 'A-TG', 'GRANDE', 'publicado'), versionBd(2, 'A-ESP', 'GRANDE', 'publicado', { esEspecial: true })];
    const d = deps(t, { repo: repoFalso(t, { versiones }) });
    await exportarProductosPorVersion(d, { ...PETICION, formato: 'PIVOTE' });
    assert.deepEqual(d.repo.cargarBaseVersiones.mock.calls[0].arguments[0], [1]);
    const hojaVersiones = d.escribirLibro.mock.calls[0].arguments[0][1];
    assert.deepEqual(hojaVersiones.filas.map((f) => f[6].valor), ['No', 'Sí']); // ordenadas por código: A-ESP, A-TG
  });

  it('en la Lista una versión especial sí se incluye', async (t) => {
    const versiones = [versionBd(1, 'A-TG', 'GRANDE', 'publicado'), versionBd(2, 'A-ESP', 'GRANDE', 'publicado', { esEspecial: true })];
    const d = deps(t, { repo: repoFalso(t, { versiones }) });
    await exportarProductosPorVersion(d, PETICION);
    assert.deepEqual(d.repo.cargarBaseVersiones.mock.calls[0].arguments[0], [1, 2]);
  });

  it('jerarquía: solo los SKU de CATI; los códigos se validan antes', async (t) => {
    const d = deps(t, { catalogo: catalogoFalso(t, ['S2']) });
    const r = await exportarProductosPorVersion(d, { ...PETICION, area: 'A1', departamento: 'D1' });
    assert.equal(r.filas, 1);
    assert.deepEqual(d.catalogo.listarSkusPorJerarquia.mock.calls[0].arguments, ['departamento', 'D1']);
  });

  it('área inexistente → 400, no se pide el conjunto de SKU ni se carga la base', async (t) => {
    const d = deps(t);
    await assert.rejects(exportarProductosPorVersion(d, { ...PETICION, area: '999' }), (e) => e.status === 400);
    assert.equal(d.catalogo.listarSkusPorJerarquia.mock.callCount(), 0);
    assert.equal(d.repo.cargarBaseVersiones.mock.callCount(), 0);
  });

  it('CATI caído → 503 sin tomar el semáforo ni cargar la base', async (t) => {
    const d = deps(t, { catalogo: { obtenerAreas: async () => { throw errorCati; } } });
    await assert.rejects(exportarProductosPorVersion(d, { ...PETICION, area: 'A1' }), (e) => e === errorCati);
    assert.equal(d.repo.cargarBaseVersiones.mock.callCount(), 0);
    assert.equal(d.semaforo.intentarTomar(), true);
  });

  it('posicionIds acota (regla D3): ids ajenos se descartan y solo suman las posiciones que pasaron', async (t) => {
    const base = baseExportacion([posicionBase(1, 1, 'S1', { facings: 2 }), posicionBase(2, 1, 'S1', { facings: 3 }), posicionBase(3, 2, 'S1')]);
    const d = deps(t, { repo: repoFalso(t, { base }) });
    const r = await exportarProductosPorVersion(d, { ...PETICION, posicionIds: [2, 777, 888] });
    assert.equal(r.filas, 1);
    const hoja = hojaPrincipal(d.escribirLibro);
    assert.equal(hoja.filas[0][hoja.encabezados.indexOf('Facing horizontal')].valor, 3);
  });

  it('posicionIds que excluye todo → libro con 0 filas (200)', async (t) => {
    const d = deps(t);
    const r = await exportarProductosPorVersion(d, { ...PETICION, posicionIds: [555] });
    assert.equal(r.filas, 0);
    assert.deepEqual(hojaPrincipal(d.escribirLibro).filas, []);
    assert.equal(d.escribirLibro.mock.callCount(), 1);
  });

  it('semáforo tomado → 503 EXPORTACION_EN_CURSO sin cargar la base', async (t) => {
    const semaforo = crearSemaforo(1);
    semaforo.intentarTomar();
    const d = deps(t, { semaforo });
    await assert.rejects(exportarProductosPorVersion(d, PETICION), (e) => e.status === 503 && e.code === 'EXPORTACION_EN_CURSO');
    assert.equal(d.repo.cargarBaseVersiones.mock.callCount(), 0);
  });

  it('el semáforo vuelve a estar libre tras éxito, error del repo, error del libro y tope de filas', async (t) => {
    const casos = [
      deps(t),
      deps(t, { repo: { ...repoFalso(t), cargarBaseVersiones: async () => { throw new Error('bd'); } } }),
      deps(t, { escribirLibro: async () => { throw new Error('libro'); } }),
      deps(t, { maximoFilas: 1 }),
    ];
    for (const d of casos) {
      await exportarProductosPorVersion(d, PETICION).catch(() => {});
      assert.equal(d.semaforo.intentarTomar(), true);
    }
  });

  it('maximoFilas = 1 con 3 filas → 422 con { filas, maximo } y escribirLibro no se llama', async (t) => {
    const d = deps(t, { maximoFilas: 1 });
    await assert.rejects(exportarProductosPorVersion(d, PETICION), (e) => {
      assert.equal(e.status, 422);
      assert.equal(e.code, 'EXPORTACION_DEMASIADO_GRANDE');
      assert.deepEqual(e.details, { filas: 3, maximo: 1 });
      return true;
    });
    assert.equal(d.escribirLibro.mock.callCount(), 0);
  });

  it('con el semáforo compartido real: una exportación en curso bloquea a la otra', async (t) => {
    let liberar;
    const lento = deps(t, { semaforo: semaforoExportacion, escribirLibro: () => new Promise((resolve) => { liberar = () => resolve(Buffer.from('x')); }) });
    const primera = exportarProductosPorVersion(lento, PETICION);
    await new Promise((r) => setImmediate(r));
    await assert.rejects(exportarProductosPorVersion(deps(t, { semaforo: semaforoExportacion }), PETICION), (e) => e.code === 'EXPORTACION_EN_CURSO');
    liberar();
    await primera;
    assert.equal(semaforoExportacion.intentarTomar(), true);
    semaforoExportacion.liberar();
  });
});
