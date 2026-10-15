/**
 * Pruebas de la numeración de ganchos de "SKU en la versión".
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

const { recorrerVersion } = require('../../src/domain/skuVersion/skuVersion.entity');

function version(ganchosDeLaSegunda) {
  const posicion = (id, ganchos) => ({ id, nivelId: 1, ordenHorizontal: id, facings: 1, ganchos });
  return {
    gondolas: [{ id: 1, orden: 1, anchoCm: 100, altoCm: 200, porUbicar: false }],
    secciones: [],
    niveles: [{ id: 1, gondolaId: 1, seccionId: null, orden: 1 }],
    posiciones: [posicion(1, null), posicion(2, ganchosDeLaSegunda), posicion(3, null), posicion(4, null)],
  };
}

describe('recorrerVersion', () => {
  it('un gancho de exhibición no reserva número', () => {
    const r = recorrerVersion(version(['2E']));
    assert.deepEqual(r.map((x) => x.ganchos), [[1], ['2E'], [2], [3]]);
  });

  it('un gancho numérico guardado sí reserva su número', () => {
    const r = recorrerVersion(version([2]));
    assert.deepEqual(r.map((x) => x.ganchos), [[1], [2], [3], [4]]);
  });
});
