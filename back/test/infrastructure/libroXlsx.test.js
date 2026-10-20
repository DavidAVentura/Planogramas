/**
 * Pruebas del adaptador del libro .xlsx: ninguna celda se interpreta como fórmula, el texto se sanea
 * y los números no finitos quedan vacíos. `fflate` solo se usa aquí para abrir el archivo.
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');
const { unzipSync, strFromU8 } = require('fflate');

const { escribirLibroXlsx, sanear } = require('../../src/infrastructure/exportacion/libroXlsx');

const texto = (valor) => ({ tipo: 'texto', valor });
const numero = (valor) => ({ tipo: 'numero', valor });

async function abrir(hojas) {
  const buffer = await escribirLibroXlsx(hojas);
  assert.ok(Buffer.isBuffer(buffer));
  const archivos = unzipSync(new Uint8Array(buffer));
  const leer = (nombre) => strFromU8(archivos[nombre]);
  return { archivos, leer, hojas: Object.keys(archivos).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)) };
}

describe('escribirLibroXlsx', () => {
  it('ninguna hoja contiene fórmulas aunque el texto parezca una', async () => {
    const peligrosos = ['=HYPERLINK("http://x","a")', '+1', '-1', '@SUM(A1)', "=cmd|' /C calc'!A0"];
    const { leer, hojas } = await abrir([{ nombre: 'Consolidado', encabezados: ['Col'], filas: peligrosos.map((p) => [texto(p)]) }]);
    for (const h of hojas) assert.ok(!/<f[ >]/.test(leer(h)), `${h} no debe tener <f>`);
    const compartidas = leer('xl/sharedStrings.xml');
    assert.ok(compartidas.includes('@SUM(A1)'));
    assert.ok(compartidas.includes('+1'));
    // todas las celdas de datos son de tipo texto compartido (t="s")
    const celdas = leer(hojas[0]).match(/<c r="A\d+"[^>]*>/g);
    assert.equal(celdas.length, peligrosos.length + 1);
    assert.ok(celdas.every((c) => c.includes('t="s"')));
  });

  it('elimina caracteres de control y trunca a 32 767', async () => {
    assert.equal(sanear('a\u0000b\u0008c\u001Fd'), 'abcd');
    assert.equal(sanear('a\tb\nc'), 'a\tb\nc');
    assert.equal(sanear('x'.repeat(40000)).length, 32767);
    const { leer } = await abrir([{ nombre: 'H', encabezados: ['E'], filas: [[texto('a\u0000b')], [texto('y'.repeat(40000))]] }]);
    const compartidas = leer('xl/sharedStrings.xml');
    assert.ok(!compartidas.includes('\u0000'));
    assert.ok(compartidas.includes('>ab<'));
    assert.ok(compartidas.includes('y'.repeat(32767)));
    assert.ok(!compartidas.includes('y'.repeat(32768)));
  });

  it('NaN e Infinity quedan como celda vacía; los números finitos se escriben como número', async () => {
    const { leer, hojas } = await abrir([{ nombre: 'H', encabezados: ['E'], filas: [[numero(NaN)], [numero(Infinity)], [numero(7)], [texto(null)]] }]);
    const xml = leer(hojas[0]);
    assert.ok(!xml.includes('NaN') && !xml.includes('Infinity'));
    assert.ok(/<c r="A4"><v>7<\/v><\/c>/.test(xml));
    assert.ok(!/<c r="A2"/.test(xml) && !/<c r="A3"/.test(xml) && !/<c r="A5"/.test(xml));
  });

  it('una hoja por entrada, en el orden recibido y con su nombre; sin filas solo encabezados', async () => {
    const { leer, hojas } = await abrir([
      { nombre: 'Planograma', encabezados: ['SKU'], filas: [[texto('1')]] },
      { nombre: 'Cross', encabezados: ['SKU'], filas: [] },
    ]);
    assert.equal(hojas.length, 2);
    const libro = leer('xl/workbook.xml');
    assert.ok(libro.includes('name="Planograma"') && libro.includes('name="Cross"'));
    assert.ok(libro.indexOf('Planograma') < libro.indexOf('Cross'));
    assert.equal((leer('xl/worksheets/sheet2.xml').match(/<row /g) ?? []).length, 1);
  });
});

describe('escribirLibroXlsx con grupos, anchos y congelado', () => {
  const hojaConGrupos = {
    nombre: 'Pivote',
    grupos: [{ titulo: 'TG', desde: 1, hasta: 2 }, { titulo: '=HYPERLINK("http://x","clic")\u0007', desde: 3, hasta: 3 }],
    encabezados: ['SKU', 'A_TG', 'B_TG', 'A_TM'],
    filas: [[texto('1'), numero(2), numero(3), texto('x')]],
    anchos: [14, 12, 12, 20],
    congelarFilas: 2,
    congelarColumnas: 1,
  };

  it('construirHoja: fila 1 con el título en `desde` con columnSpan y el resto vacío; congelado y anchos', () => {
    const { construirHoja } = require('../../src/infrastructure/exportacion/libroXlsx');
    const hoja = construirHoja(hojaConGrupos);
    const [grupos, encabezados] = hoja.data;
    assert.equal(grupos[0], null);
    assert.equal(grupos[1].value, 'TG');
    assert.equal(grupos[1].columnSpan, 2);
    assert.equal(grupos[2], null);
    assert.equal(grupos[3].type, String); // una fórmula como título sigue siendo texto
    assert.equal(grupos[3].value, '=HYPERLINK("http://x","clic")'); // y sin caracteres de control
    assert.equal(encabezados[0].value, 'SKU');
    assert.deepEqual(hoja.columns, [{ width: 14 }, { width: 12 }, { width: 12 }, { width: 20 }]);
    assert.equal(hoja.stickyRowsCount, 2);
    assert.equal(hoja.stickyColumnsCount, 1);
  });

  it('una hoja sin los campos nuevos se escribe como antes (sin columns ni sticky)', () => {
    const { construirHoja } = require('../../src/infrastructure/exportacion/libroXlsx');
    const hoja = construirHoja({ nombre: 'H', encabezados: ['E'], filas: [] });
    assert.deepEqual(Object.keys(hoja), ['sheet', 'data']);
    assert.equal(hoja.data.length, 1);
  });

  it('el archivo generado combina el grupo y no contiene fórmulas', async () => {
    const { leer, hojas } = await abrir([hojaConGrupos]);
    const xml = leer(hojas[0]);
    assert.ok(/<mergeCell ref="B1:C1"\s*\/>/.test(xml));
    assert.ok(!/<f[ >]/.test(xml));
    assert.ok(/<pane /.test(xml));
    assert.ok(!leer('xl/sharedStrings.xml').includes('\u0007'));
  });
});
