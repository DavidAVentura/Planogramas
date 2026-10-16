/**
 * Pruebas de normalizarAutor: saneado del nombre, recorte por puntos de código y rechazo de
 * autores sin número de empleado.
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

const { normalizarAutor, LONGITUD_MAXIMA_NOMBRE_AUTOR } = require('../../src/domain/compartido/autor');

describe('normalizarAutor', () => {
  it('devuelve número y nombre normales', () => {
    assert.deepEqual(
      normalizarAutor({ numero: '100702', nombre: 'JUAN LÓPEZ' }),
      { subido_por: '100702', subido_por_nombre: 'JUAN LÓPEZ' },
    );
  });

  it('no transforma el número (ni siquiera con espacios)', () => {
    assert.equal(normalizarAutor({ numero: '100702', nombre: 'A' }).subido_por, '100702');
    assert.equal(normalizarAutor({ numero: ' 100702', nombre: 'A' }).subido_por, ' 100702');
    assert.equal(normalizarAutor({ numero: 100702, nombre: 'A' }).subido_por, '100702');
  });

  it('nombre null o undefined da null', () => {
    assert.equal(normalizarAutor({ numero: '1', nombre: null }).subido_por_nombre, null);
    assert.equal(normalizarAutor({ numero: '1' }).subido_por_nombre, null);
  });

  it('nombre igual al número da null (usuarioAuditoria lo rellena con el número)', () => {
    assert.equal(normalizarAutor({ numero: '100702', nombre: '100702' }).subido_por_nombre, null);
  });

  it('recorta a 150 unidades UTF-16 (nvarchar)', () => {
    const r = normalizarAutor({ numero: '1', nombre: 'A'.repeat(200) }).subido_por_nombre;
    assert.equal(r.length, 150);
  });

  it('no parte un emoji ni excede 150 unidades UTF-16', () => {
    const sueltos = /(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])/;

    // 149 + emoji (2 unidades) = 151: el emoji se descarta completo.
    const r = normalizarAutor({ numero: '1', nombre: 'A'.repeat(149) + '😀' + 'B'.repeat(10) }).subido_por_nombre;
    assert.equal(r, 'A'.repeat(149));
    assert.doesNotMatch(r, sueltos);

    // Emoji que cabe: 148 + emoji = 150.
    const cabe = normalizarAutor({ numero: '1', nombre: 'A'.repeat(148) + '😀' + 'B' }).subido_por_nombre;
    assert.equal(cabe, 'A'.repeat(148) + '😀');
    assert.equal(cabe.length, 150);

    const muchos = normalizarAutor({ numero: '1', nombre: '😀'.repeat(200) }).subido_por_nombre;
    assert.equal(muchos.length, 150);
    assert.doesNotMatch(muchos, sueltos);
  });

  it('quita caracteres de formato (ancho cero, bidi, BOM)', () => {
    assert.equal(normalizarAutor({ numero: '1', nombre: 'JU\u200BAN\u061C\uFEFF' }).subido_por_nombre, 'JUAN');
  });

  it('quita controles y marcas bidi, colapsa espacios y recorta', () => {
    assert.equal(normalizarAutor({ numero: '1', nombre: '  JUAN‮ LÓPEZ\n ' }).subido_por_nombre, 'JUAN LÓPEZ');
  });

  it('solo controles da null', () => {
    assert.equal(normalizarAutor({ numero: '1', nombre: '\u0000‮' }).subido_por_nombre, null);
  });

  it('conserva tildes y ñ', () => {
    assert.equal(normalizarAutor({ numero: '1', nombre: 'MUÑOZ ÁLVAREZ' }).subido_por_nombre, 'MUÑOZ ÁLVAREZ');
  });

  it('sin número de empleado (o "sistema") lanza un error sin status', () => {
    for (const numero of [undefined, null, '', '   ', 'sistema']) {
      assert.throws(
        () => normalizarAutor({ numero, nombre: 'X' }),
        (err) => err instanceof Error && err.status === undefined,
      );
    }
    assert.throws(() => normalizarAutor(undefined));
  });
});
