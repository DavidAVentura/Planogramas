/**
 * Pruebas de los esquemas estrictos de la query del Consolidado Tiendas.
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

const { validarQueryEstricta } = require('../../src/application/compartido/validacion');
const { schemaListado, schemaFiltros, schemaExportar, verificarColumnas } = require('../../src/application/consolidado/consolidado.schemas');

const listar = (q) => validarQueryEstricta(schemaListado, q);
const exportar = (q) => validarQueryEstricta(schemaExportar, q);
const rechaza = (fn) => assert.throws(fn, (e) => e.isJoi === true || e.name === 'ValidationError');
const ids = (n) => Array.from({ length: n }, (_, i) => i + 1).join(',');

describe('schemaListado', () => {
  it('aplica los valores por defecto', () => {
    assert.deepEqual({ ...listar({}) }, {
      busqueda: '', vista: 'PLANOGRAMA', soloDuplicados: false, page: 1, pageSize: 50, orden: 'sku', direccion: 'asc',
    });
  });

  it('convierte listas csv a arreglos y números', () => {
    const v = listar({ tiendaIds: '1,2,3', versionIds: '210', estados: 'publicado,piloto', page: '3', pageSize: '100', soloDuplicados: 'true', area: 'A1', busqueda: '  llanta ' });
    assert.deepEqual(v.tiendaIds, [1, 2, 3]);
    assert.deepEqual(v.versionIds, [210]);
    assert.deepEqual(v.estados, ['publicado', 'piloto']);
    assert.equal(v.page, 3);
    assert.equal(v.pageSize, 100);
    assert.equal(v.soloDuplicados, true);
    assert.equal(v.area, 'A1');
    assert.equal(v.busqueda, 'llanta');
  });

  it('parámetro desconocido → 400', () => {
    rechaza(() => listar({ foo: '1' }));
    rechaza(() => listar({ formato: 'DETALLADO' }));
  });

  it('listas de enteros malformadas → 400', () => {
    rechaza(() => listar({ tiendaIds: ids(201) }));
    assert.equal(listar({ tiendaIds: ids(200) }).tiendaIds.length, 200);
    for (const malo of ['1,,2', '1,abc', '0', '-1', '1.5', '01', '', ' ', '1,1', '9007199254740993', 'x'.repeat(5000), `1,${'2'.repeat(3000)}`]) {
      rechaza(() => listar({ tiendaIds: malo }));
    }
    rechaza(() => listar({ versionIds: ids(501) }));
  });

  it('parámetro repetido (arreglo) → 400', () => {
    rechaza(() => listar({ tiendaIds: ['1', '2'] }));
    rechaza(() => listar({ busqueda: ['a', 'b'] }));
    rechaza(() => listar({ soloDuplicados: ['true', 'false'] }));
    rechaza(() => listar({ vista: ['CROSS', 'IMPULSO'] }));
  });

  it('enumerados fuera de la lista → 400', () => {
    rechaza(() => listar({ orden: 'sku;DROP TABLE Posicion' }));
    rechaza(() => listar({ orden: '__proto__' }));
    rechaza(() => listar({ direccion: 'up' }));
    rechaza(() => listar({ vista: 'AGREGADO' }));
    rechaza(() => listar({ estados: 'borrador' }));
    rechaza(() => listar({ estados: 'publicado,publicado' }));
    rechaza(() => listar({ estados: 'publicado,borrador' }));
    rechaza(() => listar({ pageSize: '100000' }));
    rechaza(() => listar({ pageSize: '10' }));
  });

  it('page fuera de rango o no entera → 400', () => {
    rechaza(() => listar({ page: '1.5' }));
    rechaza(() => listar({ page: '0' }));
    rechaza(() => listar({ page: '10001' }));
    assert.equal(listar({ page: '10000' }).page, 10000);
  });

  it('jerarquía: vacía o con caracteres no permitidos → 400', () => {
    rechaza(() => listar({ area: '' }));
    rechaza(() => listar({ area: 'A B' }));
    rechaza(() => listar({ familia: 'a'.repeat(21) }));
    rechaza(() => listar({ categoria: "x'; --" }));
    assert.equal(listar({ subcategoria: 'AB-12_x' }).subcategoria, 'AB-12_x');
  });

  it('búsqueda: tope de 100 caracteres, vacía permitida, regex sin efecto', () => {
    rechaza(() => listar({ busqueda: 'a'.repeat(101) }));
    assert.equal(listar({ busqueda: '' }).busqueda, '');
    assert.equal(listar({ busqueda: '   ' }).busqueda, '');
    assert.equal(listar({ busqueda: '(((((a' }).busqueda, '(((((a');
  });

  it('soloDuplicados=true solo con vista PLANOGRAMA', () => {
    rechaza(() => listar({ soloDuplicados: 'true', vista: 'CROSS' }));
    rechaza(() => listar({ soloDuplicados: 'true', vista: 'IMPULSO' }));
    assert.equal(listar({ soloDuplicados: 'true', vista: 'PLANOGRAMA' }).soloDuplicados, true);
    assert.equal(listar({ soloDuplicados: 'false', vista: 'CROSS' }).soloDuplicados, false);
  });
});

describe('schemaFiltros', () => {
  it('no admite ningún parámetro', () => {
    assert.deepEqual({ ...validarQueryEstricta(schemaFiltros, {}) }, {});
    rechaza(() => validarQueryEstricta(schemaFiltros, { foo: '1' }));
  });
});

describe('schemaExportar', () => {
  const BASE = { formato: 'DETALLADO', columnas: 'sku,tienda' };

  it('acepta un detallado y conserva el orden de columnas', () => {
    const v = exportar({ ...BASE, columnas: 'tienda,sku,modo' });
    assert.deepEqual(v.columnas, ['tienda', 'sku', 'modo']);
    assert.equal(v.formato, 'DETALLADO');
    assert.equal(v.hojas, undefined);
  });

  it('hojas es requerida con HOJAS y prohibida en los otros formatos', () => {
    assert.deepEqual(exportar({ formato: 'HOJAS', columnas: 'sku', hojas: 'CROSS,PLANOGRAMA' }).hojas, ['CROSS', 'PLANOGRAMA']);
    rechaza(() => exportar({ formato: 'HOJAS', columnas: 'sku' }));
    rechaza(() => exportar({ formato: 'HOJAS', columnas: 'sku', hojas: 'OTRA' }));
    rechaza(() => exportar({ formato: 'HOJAS', columnas: 'sku', hojas: 'CROSS,CROSS' }));
    rechaza(() => exportar({ ...BASE, hojas: 'CROSS' }));
    rechaza(() => exportar({ formato: 'AGREGADO', columnas: 'sku', hojas: 'CROSS' }));
  });

  it('formato y columnas requeridos; formato válido', () => {
    rechaza(() => exportar({ columnas: 'sku' }));
    rechaza(() => exportar({ formato: 'DETALLADO' }));
    rechaza(() => exportar({ formato: 'CSV', columnas: 'sku' }));
    rechaza(() => exportar({ formato: 'DETALLADO', columnas: '' }));
  });

  it('columnas duplicadas o más de 24 → 400', () => {
    rechaza(() => exportar({ ...BASE, columnas: 'sku,sku' }));
    rechaza(() => exportar({ ...BASE, columnas: Array.from({ length: 25 }, (_, i) => `c${i}`).join(',') }));
    rechaza(() => exportar({ ...BASE, columnas: 'x'.repeat(601) }));
  });

  it('parámetros de listado prohibidos en la exportación', () => {
    for (const p of ['vista', 'page', 'pageSize', 'orden', 'direccion']) {
      rechaza(() => exportar({ ...BASE, [p]: p === 'vista' ? 'CROSS' : '1' }));
    }
    rechaza(() => exportar({ ...BASE, foo: '1' }));
  });

  it('acepta los filtros comunes', () => {
    const v = exportar({ ...BASE, tiendaIds: '1,2', estados: 'piloto', familia: 'F1', soloDuplicados: 'true' });
    assert.deepEqual(v.tiendaIds, [1, 2]);
    assert.deepEqual(v.estados, ['piloto']);
    assert.equal(v.soloDuplicados, true);
  });
});

describe('verificarColumnas', () => {
  it('claves fuera de la lista blanca → 400 con columnasInvalidas', () => {
    const v = exportar({ formato: 'DETALLADO', columnas: 'sku,__proto__,constructor,inventario' });
    assert.throws(() => verificarColumnas(v.columnas), (e) => {
      assert.equal(e.status, 400);
      assert.equal(e.code, 'VALIDATION_ERROR');
      assert.deepEqual(e.details, { columnasInvalidas: ['__proto__', 'constructor', 'inventario'] });
      return true;
    });
  });

  it('acota el eco de claves largas', () => {
    assert.throws(() => verificarColumnas(['y'.repeat(500)]), (e) => e.details.columnasInvalidas[0].length === 40);
  });

  it('claves válidas pasan', () => {
    assert.deepEqual(verificarColumnas(['sku', 'modo']), ['sku', 'modo']);
  });
});
