import { describe, expect, it } from 'vitest';
import type { FilaConsolidado, GrupoConsolidado } from '../../types/consolidado';
import {
  CLAVES_COLUMNA_CONSOLIDADO,
  COLUMNAS_CONSOLIDADO,
  OCULTAS_INICIALES,
  PREFERENCIAS_CONSOLIDADO_INICIALES,
  columnaConsolidado,
  textoCelda,
  validarPreferenciasConsolidado,
} from './columnasConsolidado';

// Mismo literal que back/test/domain/consolidadoColumnas.test.js (DT-39).
const CLAVES_ESPERADAS = [
  'sku', 'producto', 'tienda', 'version', 'estadoVersion', 'seccion', 'gondola', 'nivel', 'orden',
  'ganchos', 'accesorio', 'montaje', 'facings', 'apilable', 'capacidadFacing', 'capacidadMaxima',
  'minEstetico', 'minFinal', 'maxFinal', 'perfil', 'modo', 'decision', 'observaciones', 'sustituto',
];

const grupo: GrupoConsolidado = {
  sku: '1200206',
  producto: { nombre: 'Llanta', marca: 'Acme', skuSustituto: '999', nombreSustituto: 'Llanta B' },
  tienda: { id: 7, codigo: '101', nombre: 'Zona 9', tipo: 'GRANDE', marca: 'Cemaco' },
  planogramasEnTienda: 1,
  planograma: [],
  otras: [],
};

function fila(extra: Partial<FilaConsolidado> = {}): FilaConsolidado {
  return {
    versionId: 210, codigoVersion: 'AUTOS 02-TG', planogramaId: 165, planogramaNombre: 'Autos',
    estadoVersion: 'publicado', modo: 'PLANOGRAMA',
    ubicaciones: [
      { posicionId: 1, gondola: 'G1', porUbicar: false, seccion: 1, nivel: 3, orden: 2, ganchos: [5, '54E'] },
      { posicionId: 2, gondola: 'G1', porUbicar: false, seccion: 2, nivel: 1, orden: 1, ganchos: [12] },
    ],
    accesorios: [{ codigo: 'R45-12', tamanoPulgadas: 12 }, { codigo: 'X', tamanoPulgadas: null }],
    facings: 2, cantidadApilable: 1, capacidadFacing: 6, capacidadMaxima: 12, minEstetico: 4,
    minFinal: 6, maxFinal: 12, minVaria: false, maxVaria: false, perfil: 'MRP', decision: 'ACTIVO',
    observaciones: 'nota',
    montaje: { colganteExterno: true, display: false, desborda: true, notaDesborde: 'sobra' },
    ...extra,
  };
}

describe('catálogo de columnas', () => {
  it('las 24 claves son exactamente las del back y cada una tiene su definición', () => {
    expect([...CLAVES_COLUMNA_CONSOLIDADO]).toEqual(CLAVES_ESPERADAS);
    expect(COLUMNAS_CONSOLIDADO.map((c) => c.clave)).toEqual(CLAVES_ESPERADAS);
  });

  it('solo SKU, Producto, Tienda y Planograma versión se ordenan', () => {
    const ordenables = COLUMNAS_CONSOLIDADO.filter((c) => c.ordenable !== null).map((c) => [c.clave, c.ordenable]);
    expect(ordenables).toEqual([['sku', 'sku'], ['producto', 'producto'], ['tienda', 'tienda'], ['version', 'version']]);
  });

  it('las visibles por defecto son las 10 acordadas', () => {
    const visibles = PREFERENCIAS_CONSOLIDADO_INICIALES.orden.filter((c) => !PREFERENCIAS_CONSOLIDADO_INICIALES.ocultas.includes(c));
    expect(visibles).toEqual(['sku', 'producto', 'tienda', 'version', 'estadoVersion', 'gondola', 'nivel', 'montaje', 'minFinal', 'maxFinal']);
    expect(OCULTAS_INICIALES).toHaveLength(14);
    expect(columnaConsolidado('minFinal').numerica).toBe(true);
  });
});

describe('validarPreferenciasConsolidado', () => {
  it('sin datos devuelve el orden y las ocultas por defecto', () => {
    expect(validarPreferenciasConsolidado(null)).toEqual(PREFERENCIAS_CONSOLIDADO_INICIALES);
  });

  it('descarta claves ajenas (__proto__, inventario) y agrega las columnas que falten', () => {
    const r = validarPreferenciasConsolidado({ orden: ['tienda', '__proto__', 'inventario', 'sku'], ocultas: ['inventario', 'constructor', 'perfil'] });
    expect(r.orden.slice(0, 2)).toEqual(['tienda', 'sku']);
    expect(r.orden).toHaveLength(24);
    expect(r.orden).not.toContain('__proto__');
    expect(r.orden).not.toContain('inventario');
    expect(r.ocultas).toEqual(['perfil']);
  });

  it('no permite ocultar todas', () => {
    expect(validarPreferenciasConsolidado({ orden: [...CLAVES_ESPERADAS], ocultas: [...CLAVES_ESPERADAS] }).ocultas).toEqual([]);
  });
});

describe('textoCelda', () => {
  it('columnas de grupo', () => {
    expect(textoCelda('sku', fila(), grupo).principal).toBe('1200206');
    expect(textoCelda('producto', fila(), grupo)).toEqual({ principal: 'Llanta', secundario: 'Acme' });
    expect(textoCelda('tienda', fila(), grupo)).toEqual({ principal: '101 · Zona 9', secundario: 'Grande' });
    expect(textoCelda('sustituto', null, grupo).principal).toBe('999 · Llanta B');
  });

  it('versión, estado y modo', () => {
    expect(textoCelda('version', fila(), grupo)).toEqual({ principal: 'AUTOS 02-TG', secundario: 'Autos' });
    expect(textoCelda('estadoVersion', fila(), grupo).principal).toBe('Publicada');
    expect(textoCelda('estadoVersion', fila({ estadoVersion: 'piloto' }), grupo).principal).toBe('Piloto');
    expect(textoCelda('modo', fila({ modo: 'CROSS' }), grupo).principal).toBe('Cross');
    expect(textoCelda('decision', fila(), grupo).principal).toBe('Activo');
  });

  it('ubicaciones: góndola con subtítulo, sección, nivel, orden y ganchos (05, 54E)', () => {
    expect(textoCelda('gondola', fila(), grupo)).toEqual({ principal: 'G1', secundario: '2 ubicaciones' });
    expect(textoCelda('gondola', fila({ ubicaciones: [fila().ubicaciones[0]] }), grupo)).toEqual({ principal: 'G1', secundario: undefined });
    expect(textoCelda('seccion', fila(), grupo).principal).toBe('1, 2');
    expect(textoCelda('nivel', fila(), grupo).principal).toBe('3, 1');
    expect(textoCelda('orden', fila(), grupo).principal).toBe('2, 1');
    expect(textoCelda('ganchos', fila(), grupo).principal).toBe('05, 54E, 12');
  });

  it('montaje: accesorios y banderas, con la nota del desborde', () => {
    expect(textoCelda('accesorio', fila(), grupo).principal).toBe('R45-12 (12"), X');
    expect(textoCelda('montaje', fila(), grupo).principal).toBe('R45-12 (12"), X, Colgante externo, Desborda la góndola: sobra');
    const sinNada = fila({ accesorios: [], montaje: { colganteExterno: false, display: true, desborda: false, notaDesborde: null } });
    expect(textoCelda('montaje', sinNada, grupo).principal).toBe('Display');
  });

  it('numéricos: número, vacío si es null y "Varía"', () => {
    expect(textoCelda('minFinal', fila(), grupo).principal).toBe('6');
    expect(textoCelda('capacidadMaxima', fila({ capacidadMaxima: null }), grupo).principal).toBe('');
    expect(textoCelda('minFinal', fila({ minVaria: true, minFinal: null }), grupo).principal).toBe('Varía');
    expect(textoCelda('maxFinal', fila({ maxVaria: true, maxFinal: null }), grupo).principal).toBe('Varía');
    expect(textoCelda('facings', fila({ facings: Number.NaN }), grupo).principal).toBe('');
  });

  it('sin planograma (fila null): las columnas de fila quedan vacías', () => {
    for (const clave of ['version', 'estadoVersion', 'gondola', 'montaje', 'minFinal', 'modo', 'perfil'] as const) {
      expect(textoCelda(clave, null, grupo).principal).toBe('');
    }
    expect(textoCelda('sku', null, grupo).principal).toBe('1200206');
  });
});
