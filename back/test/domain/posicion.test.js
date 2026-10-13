/**
 * Pruebas de las reglas de Posicion: edición por estado de versión, desborde, min/max y anchos.
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

const {
  validarVersionEditable,
  validarDesborde,
  validarMinMax,
  calcularAdvertenciaEspacio,
  calcularAnchoAsignado,
} = require('../../src/domain/posicion/posicion.entity');

describe('posicion.entity', () => {
  it('solo se editan posiciones de versiones borrador, en_desarrollo o piloto', () => {
    for (const estado of ['borrador', 'en_desarrollo', 'piloto']) {
      assert.doesNotThrow(() => validarVersionEditable(estado));
    }
    assert.throws(() => validarVersionEditable('publicado'), (err) =>
      err.status === 422 && err.details.estadoActual === 'publicado');
  });

  it('aceptar un desborde exige una nota no vacía (CU-04-08)', () => {
    assert.throws(() => validarDesborde(true, '   '), { status: 400 });
    assert.throws(() => validarDesborde(true, null), { status: 400 });
    assert.doesNotThrow(() => validarDesborde(true, 'aprobado por jefe de categoría'));
    assert.doesNotThrow(() => validarDesborde(undefined, null));
  });

  it('min no puede superar a max cuando vienen ambos', () => {
    assert.throws(() => validarMinMax(10, 5), { status: 400 });
    assert.doesNotThrow(() => validarMinMax(5, 5));
    assert.doesNotThrow(() => validarMinMax(10, undefined));
    assert.doesNotThrow(() => validarMinMax(null, 3));
  });

  it('advierte (sin bloquear) cuando el nivel supera su ancho disponible', () => {
    assert.match(calcularAdvertenciaEspacio({ anchoOcupado: 80, anchoNuevo: 30, anchoDisponible: 100 }), /110 cm \/ 100 cm/);
    assert.equal(calcularAdvertenciaEspacio({ anchoOcupado: 70, anchoNuevo: 30, anchoDisponible: 100 }), null);
  });

  it('el ancho asignado es facings × ancho del producto, o el actual si falta un dato', () => {
    assert.equal(calcularAnchoAsignado(3, 12.5, 20), 37.5);
    assert.equal(calcularAnchoAsignado(3, null, 20), 20);
    assert.equal(calcularAnchoAsignado(0, 12, 20), 20);
  });
});
