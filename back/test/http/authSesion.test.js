const test = require('node:test');
const assert = require('node:assert/strict');
const { obtenerSesion } = require('../../src/application/auth/auth.controller');

function sesionDe(usuario) {
  let cuerpo;
  obtenerSesion({ usuario }, { json(c) { cuerpo = c; } });
  return cuerpo;
}

test('solo devuelve la lista blanca de claves, en orden', () => {
  const u = Object.freeze({
    id: '1', numeroEmpleado: '1', usuario: '1', nombre: 'N', correo: undefined,
    perfiles: [], permisos: ['PLA009'], tiendas: [], cao: { token: 'x' }, extra: 1,
  });
  assert.deepEqual(Object.keys(sesionDe(u)),
    ['id', 'numeroEmpleado', 'usuario', 'nombre', 'correo', 'perfiles', 'permisos', 'capacidades', 'tiendas']);
});

test('capacidades: tienda y sin permisos', () => {
  assert.deepEqual(sesionDe({ permisos: ['PLA009', 'PLA010'] }).capacidades, { analista: false, implementador: true });
  assert.deepEqual(sesionDe({ permisos: [] }).capacidades, { analista: false, implementador: false });
});
