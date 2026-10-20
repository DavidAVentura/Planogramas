/**
 * Pruebas del esquema estricto del cuerpo de POST /implementacion/productos/exportar (B2, A1–A21).
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

const { validarQueryEstricta } = require('../../src/application/compartido/validacion');
const { schemaExportar } = require('../../src/application/implementacion/implementacion.schemas');

const validar = (cuerpo) => validarQueryEstricta(schemaExportar, { ...cuerpo });
const rechaza = (cuerpo) => assert.throws(() => validar(cuerpo), (e) => e.isJoi === true || e.name === 'ValidationError');
const BASE = { versionIds: [12, 15], formato: 'LISTA' };
const rango = (n) => Array.from({ length: n }, (_, i) => i + 1);

describe('schemaExportar (cuerpo JSON)', () => {
  it('acepta el cuerpo mínimo y el completo', () => {
    assert.deepEqual(validar(BASE), BASE);
    const completo = { ...BASE, formato: 'PIVOTE', area: 'A01', departamento: 'D05', posicionIds: [881, 882] };
    assert.deepEqual(validar(completo), completo);
  });

  it('versionIds: requerido, de 1 a 50, enteros positivos seguros, únicos', () => {
    rechaza({ formato: 'LISTA' });
    rechaza({ ...BASE, versionIds: [] });
    rechaza({ ...BASE, versionIds: [1, 1] });
    rechaza({ ...BASE, versionIds: rango(51) });
    rechaza({ ...BASE, versionIds: [0] });
    rechaza({ ...BASE, versionIds: [-1] });
    rechaza({ ...BASE, versionIds: ['x'] });
    rechaza({ ...BASE, versionIds: ['12'] }); // los números no se convierten desde texto
    rechaza({ ...BASE, versionIds: [1.5] });
    rechaza({ ...BASE, versionIds: [9007199254740993] });
    rechaza({ ...BASE, versionIds: '12,15' });
    rechaza({ ...BASE, versionIds: [null] });
    assert.deepEqual(validar({ ...BASE, versionIds: rango(50) }).versionIds.length, 50);
  });

  it('formato: requerido y solo LISTA o PIVOTE', () => {
    rechaza({ versionIds: [1] });
    rechaza({ ...BASE, formato: 'CSV' });
    rechaza({ ...BASE, formato: 'lista' });
    rechaza({ ...BASE, formato: ['LISTA'] });
  });

  it('area y departamento: patrón de código; vacío, largo, comillas o arreglo → 400', () => {
    for (const mala of ["a'b", '', 'x'.repeat(21), 'A 1', ['A1'], 1, '../x']) {
      rechaza({ ...BASE, area: mala });
      rechaza({ ...BASE, area: 'A1', departamento: mala });
    }
    assert.equal(validar({ ...BASE, area: 'x'.repeat(20) }).area.length, 20);
  });

  it('departamento sin area → 400', () => {
    rechaza({ ...BASE, departamento: 'D05' });
  });

  it('posicionIds: hasta 30 000, positivos, enteros, únicos y seguros', () => {
    assert.equal(validar({ ...BASE, posicionIds: [] }).posicionIds.length, 0);
    assert.equal(validar({ ...BASE, posicionIds: rango(30000) }).posicionIds.length, 30000);
    rechaza({ ...BASE, posicionIds: rango(30001) });
    rechaza({ ...BASE, posicionIds: [0] });
    rechaza({ ...BASE, posicionIds: [-1] });
    rechaza({ ...BASE, posicionIds: ['x'] });
    rechaza({ ...BASE, posicionIds: [3, 3] });
    rechaza({ ...BASE, posicionIds: [9007199254740993] });
    rechaza({ ...BASE, posicionIds: '1,2' });
  });

  it('clave desconocida o campo extra → 400 (incluida tiendaId y __proto__)', () => {
    rechaza({ ...BASE, foo: 1 });
    rechaza({ ...BASE, tiendaId: 5 });
    rechaza({ ...BASE, columnas: ['sku'] });
  });

  it('una clave __proto__ en el JSON no contamina el valor validado ni sus prototipos', () => {
    const valor = validar(JSON.parse('{"versionIds":[1],"formato":"LISTA","__proto__":{"admin":true}}'));
    assert.equal(valor.admin, undefined);
    assert.equal(Object.getPrototypeOf(valor), Object.prototype);
    assert.equal({}.admin, undefined);
  });
});
