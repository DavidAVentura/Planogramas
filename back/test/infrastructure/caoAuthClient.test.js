const test = require('node:test');
const assert = require('node:assert/strict');

process.env.CAO_BASE_URL = process.env.CAO_BASE_URL || 'http://cao.test';
const { mapearUsuario } = require('../../src/infrastructure/cao/caoAuthClient');

const diez = Array.from({ length: 10 }, (_, i) => `PLA${String(i + 1).padStart(3, '0')}`);
const cuerpo = () => ({
  token: 'secreto',
  user: '100702',
  username: 'DAVID VENTURA',
  perfiles: [
    { cod_perfil: 'PCOMER-EST', perfil: 'P. Comercial estandarizado', permisos: diez },
    { cod_perfil: 'TIENDA-EST', permisos: ['PLA009', 'PLA011'] },
  ],
  tiendas: [{ cod_tienda: 'T004', nombre: 'Zona 4', cod_tipo: 1 }],
});

test('permisos es la unión sin duplicados de todos los perfiles', () => {
  const u = mapearUsuario(cuerpo(), null);
  assert.deepEqual([...u.permisos].sort(), [...diez, 'PLA011'].sort());
  assert.equal(u.permisos.length, 11);
});

test('no expone cao ni token', () => {
  const u = mapearUsuario(cuerpo(), null);
  assert.ok(!('cao' in u));
  assert.ok(!('token' in u));
});

test('el usuario normalizado está congelado', () => {
  const u = mapearUsuario(cuerpo(), null);
  assert.ok(Object.isFrozen(u));
  assert.ok(Object.isFrozen(u.permisos));
  assert.ok(Object.isFrozen(u.perfiles));
  assert.ok(Object.isFrozen(u.perfiles[0]));
  assert.ok(Object.isFrozen(u.perfiles[0].permisos));
});

test('identidad, nombre y tiendas', () => {
  const u = mapearUsuario(cuerpo(), null);
  assert.equal(u.numeroEmpleado, '100702');
  assert.equal(u.nombre, 'DAVID VENTURA');
  assert.deepEqual(u.tiendas, [{ cod_tienda: 'T004', nombre: 'Zona 4', cod_tipo: 1 }]);
});

test('tiendas se mapean a campos conocidos y cada elemento queda congelado', () => {
  const c = cuerpo();
  c.tiendas = [{ cod_tienda: 'T004', nombre: 'Zona 4', cod_tipo: 1, extra: 'x' }];
  const u = mapearUsuario(c, null);
  assert.deepEqual(u.tiendas, [{ cod_tienda: 'T004', nombre: 'Zona 4', cod_tipo: 1 }]);
  assert.ok(Object.isFrozen(u.tiendas));
  assert.ok(Object.isFrozen(u.tiendas[0]));
});
