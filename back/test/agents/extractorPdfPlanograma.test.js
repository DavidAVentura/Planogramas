/**
 * Pruebas del agente de PDF: lectura y normalización de ganchos normales ("54") y de exhibición ("54E").
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

const { procesarPdf, ganchosDelEspacio, normalizarEspacios } = require('../../src/agents/extractorPdfPlanograma/extractorPdfPlanograma');

const espacio = (ganchos, orden = 1) => ({
  orden_horizontal: orden, ganchos, ancho_cm: 10, sku_impreso: null, descripcion_visual: null, confianza: 0,
});

const normalizar = (espacios, descartados = [], advertencias = []) =>
  normalizarEspacios(espacios, 1000, 'Nivel 1', (t) => advertencias.push(t), descartados);

const fixture = (espacios) => ({
  cuerpos: [{
    nombre: 'TG-26 · cuerpo 1/1', codigo_mueble: 'TG-26', categoria: null, pagina: 1,
    ancho_cm: 120, alto_cm: 200, profundidad_cm: 40, secciones: [],
    niveles: [{
      seccion_clave: null, altura_desde_piso_cm: 100, tipo_accesorio: 'GANCHO', codigo_accesorio: null,
      tamano_accesorio_pulgadas: null, espacios,
    }],
    accesorios_montaje: [], notas: null,
  }],
  advertencias: [],
});

const dependencias = (resultado) => ({
  openaiClient: { completarConArchivo: async () => resultado },
  catiClient: {
    obtenerProducto: async () => { throw new Error('no debe llamarse'); },
    buscarProductos: async () => { throw new Error('no debe llamarse'); },
  },
  accesorios: [],
  modelo: 'test',
});

const correr = (espacios) => procesarPdf({ pdfBase64: 'x', nombreArchivo: 'a.pdf' }, dependencias(fixture(espacios)));

describe('ganchosDelEspacio', () => {
  it('normaliza, ordena, quita repetidos y descarta lo inválido', () => {
    const r = ganchosDelEspacio(['54E', '054e', '54E', ' 7 ', '54A', '5E1', '1e2', '+54', '54.0', '', '0', '1000000']);
    assert.deepEqual(r.ganchos, [7, '54E']);
    assert.deepEqual(r.descartados, ['54A', '5E1', '1e2', '+54', '54.0', '0', '1000000']);
    assert.equal(r.excedentes, 0);
  });

  it('solo une el espacio antes de una E final', () => {
    assert.deepEqual(ganchosDelEspacio(['5 4']), { ganchos: [], descartados: ['5 4'], excedentes: 0 });
    assert.deepEqual(ganchosDelEspacio(['54 E']).ganchos, ['54E']);
    assert.deepEqual(ganchosDelEspacio(['54 e']).ganchos, ['54E']);
    assert.deepEqual(ganchosDelEspacio([' 54 ']).ganchos, [54]);
  });

  it('tope de 100 ganchos por espacio', () => {
    const r = ganchosDelEspacio(Array.from({ length: 150 }, (_, i) => String(i + 1)));
    assert.deepEqual(r.ganchos, Array.from({ length: 100 }, (_, i) => i + 1));
    assert.equal(r.excedentes, 50);
  });

  it('lo que no es arreglo es []; los ítems que no son texto ni número se citan como ?', () => {
    assert.deepEqual(ganchosDelEspacio(null), { ganchos: [], descartados: [], excedentes: 0 });
    const r = ganchosDelEspacio([{}, 54, '54E']);
    assert.deepEqual(r.ganchos, [54, '54E']);
    assert.deepEqual(r.descartados, ['?']);
  });

  it('cita los descartados sin caracteres de control y con 10 caracteres como máximo', () => {
    const largo = `${'a'.repeat(2500)}\n${'b'.repeat(2500)}`;
    const { descartados } = ganchosDelEspacio([largo]);
    assert.ok(descartados[0].length <= 10);
    assert.ok(!descartados[0].includes('\n'));
  });
});

describe('normalizarEspacios', () => {
  it('normaliza antes de ordenar y es independiente del orden de entrada', () => {
    const a = [espacio(['12']), espacio(['3E', 'x'])];
    const r1 = normalizar(a);
    const r2 = normalizar([...a].reverse());
    assert.deepEqual(r1.map((e) => e.ganchos), [['3E'], [12]]);
    assert.deepEqual(r2.map((e) => e.ganchos), [['3E'], [12]]);
  });

  it('facings = ganchos normales, mínimo 1', () => {
    assert.equal(normalizar([espacio(['54E'])])[0].facings, 1);
    assert.equal(normalizar([espacio(['1', '2', '3E'])])[0].facings, 2);
    const cien = Array.from({ length: 100 }, (_, i) => String(i + 1));
    assert.equal(normalizar([espacio(cien)])[0].facings, 100);
  });

  it('colecta los descartados y advierte el exceso', () => {
    const descartados = [];
    const advertencias = [];
    normalizar([espacio(['54A']), espacio(Array.from({ length: 150 }, (_, i) => String(i + 1)), 2)], descartados, advertencias);
    assert.deepEqual(descartados, ['54A']);
    assert.ok(advertencias.some((a) => a.includes('un espacio traía 150 ganchos; se conservaron los primeros 100')));
  });
});

describe('procesarPdf con ganchos de exhibición', () => {
  it('de punta a punta: 54, 54E, descartados y exceso', async () => {
    const ciento50 = Array.from({ length: 150 }, (_, i) => String(i + 1000));
    const r = await correr([espacio(['54'], 1), espacio(['54E'], 2), espacio(['54A'], 3), espacio(ciento50, 4)]);
    const espacios = r.cuerpos[0].niveles[0].espacios;
    assert.deepEqual(espacios[0].ganchos, [54]);
    assert.deepEqual(espacios[1].ganchos, ['54E']);
    assert.equal(espacios[1].facings, 1);
    const adv = r.cuerpos[0].advertencias.join('\n');
    assert.ok(adv.includes('Ganchos ilegibles descartados: 54A'));
    assert.ok(adv.includes('se conservaron los primeros 100'));
    assert.ok(!r.advertencias.some((a) => a.includes('repetidos')));
  });

  it('cita como máximo 20 tokens descartados y termina en …', async () => {
    const r = await correr(Array.from({ length: 30 }, (_, i) => espacio(['xx'], i + 1)));
    const adv = r.cuerpos[0].advertencias.find((a) => a.startsWith('Ganchos ilegibles descartados'));
    assert.ok(adv.endsWith('…. Revisá esos espacios.'));
    assert.equal(adv.split(': ')[1].split('…')[0].split(', ').length, 20);
  });
});
