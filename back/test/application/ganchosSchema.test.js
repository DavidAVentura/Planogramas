/**
 * Pruebas del esquema común de ganchos (número = normal, "<n>E" = exhibición).
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');
const fs               = require('node:fs');
const path             = require('node:path');

const { schemaGanchos } = require('../../src/application/compartido/ganchos.schema');

describe('schemaGanchos', () => {
  it('acepta y convierte a la forma canónica', () => {
    const casos = [
      [[54, '54E'], [54, '54E']],
      [['54'], [54]],
      [['54e'], ['54E']],
      [['054E'], ['54E']],
      [[], []],
    ];
    for (const [entrada, esperado] of casos) {
      const { error, value } = schemaGanchos.validate(entrada);
      assert.equal(error, undefined, JSON.stringify(entrada));
      assert.deepEqual(value, esperado);
    }
  });

  it('rechaza repetidos y valores fuera de contrato', () => {
    const malos = [
      [54, '54'], ['54E', '54e'], [0], ['0E'], ['54A'], ['E'], [54.5], [1000000],
      ['5E1'], ['1e2'], ['54E2'], ['+54'], ['54.0'], [true], [null],
      Array.from({ length: 101 }, (_, i) => i + 1),
    ];
    for (const entrada of malos) {
      assert.ok(schemaGanchos.validate(entrada).error, `debía rechazar ${JSON.stringify(entrada).slice(0, 40)}`);
    }
  });

  it('el mensaje explica el formato de exhibición', () => {
    const { error } = schemaGanchos.validate(['54A']);
    assert.match(error.message, /de exhibición como 54E/);
  });

  it('no usa Joi.number(), Joi.alternatives() ni pattern', () => {
    const codigo = fs.readFileSync(path.join(__dirname, '../../src/application/compartido/ganchos.schema.js'), 'utf8')
      .split('\n').filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//')).join('\n');
    assert.doesNotMatch(codigo, /Joi\.number\(|Joi\.alternatives\(|pattern/);
  });
});
