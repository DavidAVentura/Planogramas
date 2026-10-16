/**
 * Pruebas de la regla única de ganchos: número = normal, "<n>E" = exhibición.
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

const {
  normalizarGancho, numeroGancho, esGanchoExhibicion, compararGanchos, parsearGanchosJson, textoGancho,
} = require('../../src/domain/compartido/gancho');

describe('gancho', () => {
  it('normaliza a la forma canónica', () => {
    assert.equal(normalizarGancho(54), 54);
    assert.equal(normalizarGancho('54'), 54);
    assert.equal(normalizarGancho('054'), 54);
    assert.equal(normalizarGancho('054E'), '54E');
    assert.equal(normalizarGancho('54e'), '54E');
    assert.equal(normalizarGancho(' 54E '), '54E');
  });

  it('rechaza lo que no es canónico', () => {
    for (const malo of [0, '0E', -1, 54.5, '54A', 'E', '1234567', '5E1', '1e2', '54E2', '+54', '54.0', true, null, undefined, {}, 1000000]) {
      assert.equal(normalizarGancho(malo), null, `debía rechazar ${JSON.stringify(malo)}`);
    }
  });

  it('numeroGancho y esGanchoExhibicion', () => {
    assert.equal(numeroGancho('54E'), 54);
    assert.equal(numeroGancho(7), 7);
    assert.equal(esGanchoExhibicion('54E'), true);
    assert.equal(esGanchoExhibicion(54), false);
  });

  it('ordena por número y, a igualdad, el normal antes que el de exhibición', () => {
    assert.deepEqual([65, '54E', 54, '5E'].sort(compararGanchos), ['5E', 54, '54E', 65]);
  });

  it('parsearGanchosJson es tolerante', () => {
    assert.deepEqual(parsearGanchosJson('[65,"54E",54]'), [65, '54E', 54]);
    assert.deepEqual(parsearGanchosJson('[4,9]'), [4, 9]);
    assert.deepEqual(parsearGanchosJson('[4,4,"x"]'), [4]);
    for (const malo of ['x', '{}', '[]', null, '']) assert.equal(parsearGanchosJson(malo), null);
  });

  it('textoGancho: número con 2 dígitos, exhibición tal cual', () => {
    assert.equal(textoGancho(5), '05');
    assert.equal(textoGancho(54), '54');
    assert.equal(textoGancho('54E'), '54E');
  });
});
