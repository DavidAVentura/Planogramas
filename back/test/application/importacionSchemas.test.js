/**
 * Pruebas de los esquemas Joi de importación: varios accesorios por producto, legado y ganchos.
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

const { schemaImportar, schemaImportarProductos } = require('../../src/application/importacion/importacion.schemas');

const opciones = { abortEarly: false, stripUnknown: true };
const producto = (extra = {}) => ({ sku: '1111754', facings_horizontal: 2, ...extra });
const validar = (productos) => schemaImportarProductos.validate({ productos }, opciones);
const validarUno = (extra) => validar([producto(extra)]);

describe('schemaImportarProductos', () => {
  it('apunta al accesorio exacto cuando el tamaño se sale de rango', () => {
    const productos = Array.from({ length: 45 }, (_, i) => producto({ sku: `S${i}` }));
    productos[42].accesorios = [{ codigo: 'A', tamano_pulgadas: 2222 }];
    const { error } = validar(productos);
    assert.ok(error);
    assert.ok(error.details.some((d) => JSON.stringify(d.path) === JSON.stringify(['productos', 42, 'accesorios', 0, 'tamano_pulgadas'])));
  });

  it('rechaza lo que sale del contrato', () => {
    const malos = [
      { accesorios: Array.from({ length: 11 }, () => ({ codigo: 'A', tamano_pulgadas: 22 })) },
      { accesorios: [{ codigo: '', tamano_pulgadas: 22 }] },
      { accesorios: [{ codigo: '   ', tamano_pulgadas: 22 }] },
      { accesorios: [{ codigo: 'x'.repeat(51), tamano_pulgadas: 22 }] },
      { accesorios: [{ codigo: 'A', tamano_pulgadas: 0 }] },
      { accesorios: [{ codigo: 'A', tamano_pulgadas: -1 }] },
      { accesorios: [{ codigo: 'A', tamano_pulgadas: 1000 }] },
      { accesorios: [{ codigo: 'A', tamano_pulgadas: '22" // 22"' }] },
      { accesorios: [{ codigo: 'A', tamano_pulgadas: 22 }], accesorio_codigo: 'B' },
      { ganchos: ['54A'] },
    ];
    for (const extra of malos) assert.ok(validarUno(extra).error, `debía rechazar ${JSON.stringify(extra).slice(0, 60)}`);
  });

  it('la mezcla de formatos tiene mensaje propio', () => {
    const { error } = validarUno({ accesorios: [{ codigo: 'A', tamano_pulgadas: 22 }], accesorio_codigo: 'B' });
    assert.match(error.message, /no se pueden enviar juntos/);
  });

  it('descarta claves coladas del ítem de accesorio', () => {
    const { error, value } = validarUno({ accesorios: [{ codigo: 'a', accesorio_id: 1, orden: 99, posicion_id: 5 }] });
    assert.equal(error, undefined);
    assert.deepEqual(value.productos[0].accesorios, [{ codigo: 'a', tamano_pulgadas: null }]);
  });

  it('sin accesorios queda []; el legado solo es válido; ganchos canónicos', () => {
    assert.deepEqual(validarUno().value.productos[0].accesorios, []);
    const legado = validarUno({ accesorio_codigo: 'A', tamano_accesorio_pulgadas: 22 });
    assert.equal(legado.error, undefined);
    assert.equal(legado.value.productos[0].accesorio_codigo, 'A');
    assert.deepEqual(validarUno({ ganchos: [65, '54e'] }).value.productos[0].ganchos, [65, '54E']);
  });
});

describe('schemaImportar (layout)', () => {
  it('acepta una posición con ganchos enteros', () => {
    const { error } = schemaImportar.validate({
      cuerpos: [{
        destino: 'NUEVA', nombre: 'G1', ancho_cm: 100, alto_cm: 200, profundidad_cm: 50,
        niveles: [{
          orden: 1, altura_desde_piso_cm: 10, tipo_accesorio: 'GANCHO',
          posiciones: [{ orden_horizontal: 1, ancho_asignado_cm: 10, facings_horizontal: 2, ganchos: [3, 4] }],
        }],
      }],
    }, opciones);
    assert.equal(error, undefined);
  });

  const layoutCon = (ganchos) => schemaImportar.validate({
    cuerpos: [{
      destino: 'NUEVA', nombre: 'G1', ancho_cm: 100, alto_cm: 200, profundidad_cm: 50,
      niveles: [{
        orden: 1, altura_desde_piso_cm: 10, tipo_accesorio: 'GANCHO',
        posiciones: [{ orden_horizontal: 1, ancho_asignado_cm: 10, facings_horizontal: 1, ganchos }],
      }],
    }],
  }, opciones);

  it('rechaza ganchos no canónicos', () => {
    const ciento1 = Array.from({ length: 101 }, (_, i) => i + 1);
    for (const malo of [['54A'], ['5E1'], [54, '54'], ciento1]) {
      assert.ok(layoutCon(malo).error, `debía rechazar ${JSON.stringify(malo).slice(0, 40)}`);
    }
  });

  it('normaliza "54e " a "54E"', () => {
    const { error, value } = layoutCon(['54e ']);
    assert.equal(error, undefined);
    assert.deepEqual(value.cuerpos[0].niveles[0].posiciones[0].ganchos, ['54E']);
  });

  it('acepta ganchos mixtos [54, "54E"]', () => {
    assert.equal(layoutCon([54, '54E']).error, undefined);
  });
});
