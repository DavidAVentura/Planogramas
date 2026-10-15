const test = require('node:test');
const assert = require('node:assert/strict');

const { requiereAnalista, requiereImplementador, requierePermiso } =
  require('../../src/infrastructure/http/middlewares/autorizacion');
const errorHandler = require('../../src/infrastructure/http/middlewares/errorHandler');

const rango = (hasta) => Array.from({ length: hasta }, (_, i) => `PLA${String(i + 1).padStart(3, '0')}`);
const analista = Object.freeze({ numeroEmpleado: '1', permisos: Object.freeze(rango(10)) });
const tienda   = Object.freeze({ numeroEmpleado: '2', permisos: Object.freeze(['PLA009', 'PLA010']) });

function ejecutar(guard, usuario) {
  const req = { usuario, method: 'GET', baseUrl: '/x', path: '/y' };
  let error;
  guard(req, {}, (e) => { error = e; });
  return error;
}

function cuerpoDe(err) {
  let estado; let cuerpo;
  const res = { status(s) { estado = s; return this; }, json(c) { cuerpo = c; } };
  errorHandler(err, {}, res, () => {});
  return { estado, cuerpo };
}

test('requierePermiso lanza al construirse con códigos inválidos', () => {
  assert.throws(() => requierePermiso());
  assert.throws(() => requierePermiso(undefined));
  assert.throws(() => requierePermiso('PLA999'));
});

test('403 con el cuerpo exacto y sin details', (t) => {
  t.mock.method(console, 'warn', () => {});
  const err = ejecutar(requierePermiso('PLA005', 'PLA006'), tienda);
  const { estado, cuerpo } = cuerpoDe(err);
  assert.equal(estado, 403);
  assert.deepEqual(cuerpo, { error: { code: 'FORBIDDEN', message: 'No tienes permiso para esta acción' } });
});

test('sin req.usuario responde 401', () => {
  assert.equal(ejecutar(requiereAnalista, undefined).status, 401);
});

test('funciona con usuario congelado y no lo muta', () => {
  assert.equal(ejecutar(requiereAnalista, analista), undefined);
});

test('reglas: tienda pasa PLA010 e I, no A; analista pasa todo', (t) => {
  t.mock.method(console, 'warn', () => {});
  assert.equal(ejecutar(requierePermiso('PLA010'), tienda), undefined);
  assert.equal(ejecutar(requiereImplementador, tienda), undefined);
  assert.equal(ejecutar(requiereAnalista, tienda).status, 403);
  assert.equal(ejecutar(requierePermiso('PLA005', 'PLA006'), analista), undefined);
});

test('cada guard expone reglaAutorizacion', () => {
  assert.equal(requiereAnalista.reglaAutorizacion, 'A');
  assert.equal(requiereImplementador.reglaAutorizacion, 'I');
  assert.deepEqual(requierePermiso('PLA001').reglaAutorizacion, ['PLA001']);
});
