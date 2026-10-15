const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../../src/domain/compartido/permisos');

const con = (...permisos) => ({ permisos });
const rango = (desde, hasta) => Array.from({ length: hasta - desde + 1 }, (_, i) => `PLA${String(desde + i).padStart(3, '0')}`);

test('constantes congeladas y no vacías', () => {
  for (const c of [P.PERMISOS, P.CODIGOS_PERMISO, P.PERMISOS_ANALISTA, P.PERMISOS_IMPLEMENTADOR, P.PERFILES]) {
    assert.ok(Object.isFrozen(c));
    assert.ok(Object.keys(c).length > 0);
  }
});

test('esAnalista exige todos PLA001–PLA008', () => {
  assert.equal(P.esAnalista(con(...rango(1, 7))), false);
  assert.equal(P.esAnalista(con(...rango(1, 8))), true);
  assert.equal(P.esAnalista({ permisos: rango(1, 10).join(',') }), false);
});

test('null y objeto vacío fallan cerrado', () => {
  for (const u of [null, undefined, {}]) {
    assert.equal(P.esAnalista(u), false);
    assert.equal(P.esImplementador(u), false);
    assert.equal(P.puedeLecturaCompartida(u), false);
    assert.equal(P.tieneAlguno(u, ['PLA001']), false);
    assert.deepEqual(P.capacidades(u), { analista: false, implementador: false });
  }
});

test('tieneAlguno: lista vacía y comparación exacta', () => {
  assert.equal(P.tieneAlguno(con('PLA001'), []), false);
  assert.equal(P.tieneAlguno(con('PLA001'), undefined), false);
  assert.equal(P.tieneAlguno(con('pla001'), ['PLA001']), false);
  assert.equal(P.tieneAlguno(con('PLA001'), ['PLA002', 'PLA001']), true);
});

test('esCodigoPermiso', () => {
  assert.equal(P.esCodigoPermiso('PLA010'), true);
  assert.equal(P.esCodigoPermiso('PLA999'), false);
  assert.equal(P.esCodigoPermiso(undefined), false);
});

test('usuario de tienda: implementador y lectura compartida, no analista', () => {
  const u = con('PLA009', 'PLA010');
  assert.equal(P.esImplementador(u), true);
  assert.equal(P.puedeLecturaCompartida(u), true);
  assert.equal(P.esAnalista(u), false);
  assert.equal(P.esImplementador(con('PLA010')), true);
});

test('capacidades no muta el argumento', () => {
  const u = Object.freeze({ permisos: Object.freeze(rango(1, 10)) });
  assert.deepEqual(P.capacidades(u), { analista: true, implementador: true });
});
