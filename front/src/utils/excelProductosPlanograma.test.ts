import { describe, expect, it } from 'vitest';
import {
  accesoriosDeCeldas, agruparAccesorios, erroresDeCatalogo, ganchosCelda, interpretarHojaProductos, letraColumna,
} from './excelProductosPlanograma';

const ENCABEZADO = ['SKU', 'Facings_TG', 'Nombre_accesorio_TG', 'Tamano_accesorio_TG', 'TG1', 'TG2'];
type Celda = string | number | null;
const hoja = (...filas: Celda[][]) => interpretarHojaProductos([ENCABEZADO, ...filas]);

describe('letraColumna', () => {
  it('convierte el índice a letra de Excel', () => {
    expect(letraColumna(0)).toBe('A');
    expect(letraColumna(25)).toBe('Z');
    expect(letraColumna(26)).toBe('AA');
    expect(letraColumna(27)).toBe('AB');
  });
});

describe('accesoriosDeCeldas', () => {
  const A22 = { codigo: 'A', tamano_pulgadas: 22 };

  it('un nombre con varios tamaños repite el accesorio', () => {
    expect(accesoriosDeCeldas('A', '22" // 22"')).toEqual({ ok: true, valor: [A22, A22] });
  });
  it('varios nombres con un tamaño: todos con ese tamaño', () => {
    expect(accesoriosDeCeldas('A // B', '22"')).toEqual({ ok: true, valor: [A22, { codigo: 'B', tamano_pulgadas: 22 }] });
  });
  it('varios nombres y tamaños emparejados por posición', () => {
    expect(accesoriosDeCeldas('A // B', '22" // 12"')).toEqual({ ok: true, valor: [A22, { codigo: 'B', tamano_pulgadas: 12 }] });
  });
  it('sin tamaño y sin nombre', () => {
    expect(accesoriosDeCeldas('A // B', null)).toEqual({
      ok: true, valor: [{ codigo: 'A', tamano_pulgadas: null }, { codigo: 'B', tamano_pulgadas: null }],
    });
    expect(accesoriosDeCeldas('A', null)).toEqual({ ok: true, valor: [{ codigo: 'A', tamano_pulgadas: null }] });
    expect(accesoriosDeCeldas(null, '22"')).toEqual({ ok: true, valor: [] });
    expect(accesoriosDeCeldas(null, 'abc')).toEqual({ ok: true, valor: [] });
  });
  it('un solo / no separa', () => {
    expect(accesoriosDeCeldas('A/B', null)).toEqual({ ok: true, valor: [{ codigo: 'A/B', tamano_pulgadas: null }] });
  });
  it('nombres y tamaños que no cuadran son error en el tamaño', () => {
    const r = accesoriosDeCeldas('A // B', '22" // 22" // 8"');
    expect(r).toMatchObject({ ok: false, campo: 'tamano_accesorio' });
  });
  it('más de 10 accesorios es error', () => {
    const tamanos = Array.from({ length: 11 }, () => '22"').join(' // ');
    expect(accesoriosDeCeldas('A', tamanos)).toMatchObject({ ok: false, campo: 'tamano_accesorio' });
    const nombres = Array.from({ length: 11 }, (_, i) => `N${i}`).join(' // ');
    expect(accesoriosDeCeldas(nombres, null)).toMatchObject({ ok: false, campo: 'nombre_accesorio' });
  });
  it('nombre de más de 50 caracteres es error', () => {
    expect(accesoriosDeCeldas('X'.repeat(51), null)).toMatchObject({ ok: false, campo: 'nombre_accesorio' });
  });
  it('formatos de tamaño válidos e inválidos', () => {
    for (const bueno of ['22.5', '22,5', "22''", '22 pulg', '22"', 22]) {
      expect(accesoriosDeCeldas('A', bueno).ok, String(bueno)).toBe(true);
    }
    for (const malo of ['abc', '0', '1000', '22-24', 0, 1000]) {
      expect(accesoriosDeCeldas('A', malo).ok, String(malo)).toBe(false);
    }
    expect(accesoriosDeCeldas('A', 'abc')).toMatchObject({ motivo: expect.stringContaining('no contiene un número') });
    expect(accesoriosDeCeldas('A', '22-24')).toMatchObject({ motivo: expect.stringContaining('no es un número válido') });
  });
  it('el código se normaliza (espacios colapsados, mayúsculas)', () => {
    expect(accesoriosDeCeldas('vda-22r  pth', null)).toEqual({ ok: true, valor: [{ codigo: 'VDA-22R PTH', tamano_pulgadas: null }] });
  });
});

describe('ganchosCelda', () => {
  it('lee ganchos normales y de exhibición', () => {
    expect(ganchosCelda('65 | 54E')).toEqual({ ok: true, valor: [65, '54E'] });
    expect(ganchosCelda('54 e')).toEqual({ ok: true, valor: ['54E'] });
    expect(ganchosCelda('132 | 146')).toEqual({ ok: true, valor: [132, 146] });
    expect(ganchosCelda('168,169')).toEqual({ ok: true, valor: [168, 169] });
    expect(ganchosCelda('166-167')).toEqual({ ok: true, valor: [166, 167] });
    expect(ganchosCelda(54)).toEqual({ ok: true, valor: [54] });
    expect(ganchosCelda(0)).toEqual({ ok: true, valor: [] });
  });
  it('otra letra o un decimal es error con el token', () => {
    expect(ganchosCelda('54A')).toMatchObject({ ok: false, motivo: 'El gancho "54A" no es válido.' });
    expect(ganchosCelda(54.5)).toMatchObject({ ok: false });
    expect(ganchosCelda('54.5')).toMatchObject({ ok: false });
    expect(ganchosCelda('-3')).toMatchObject({ ok: false });
    expect(ganchosCelda('54.5 | 65')).toMatchObject({ ok: false });
  });
});

describe('interpretarHojaProductos', () => {
  it('lee varios accesorios con // y deja un origen por código', () => {
    const r = hoja(['1111754', 2, 'VDA-22R-PTH', '22" // 22"', 65, null]);
    expect(r.errores).toEqual([]);
    expect(r.productos).toHaveLength(1);
    expect(r.productos[0].accesorios).toEqual([
      { codigo: 'VDA-22R-PTH', tamano_pulgadas: 22 },
      { codigo: 'VDA-22R-PTH', tamano_pulgadas: 22 },
    ]);
    expect(r.origenesAccesorio).toEqual([{ fila: 2, columna: 'Nombre_accesorio_TG', letra: 'C', codigo: 'VDA-22R-PTH' }]);
  });

  it('une los ganchos de todas las columnas sin mezclar 54 con 54E', () => {
    const r = hoja(['1', 2, null, null, 54, '54E']);
    expect(r.productos[0].ganchos).toEqual([54, '54E']);
  });

  it('facings con dos números es error con fila, columna y letra, y no hay productos', () => {
    const r = hoja(['1', '10 // 12', null, null, null, null]);
    expect(r.productos).toEqual([]);
    expect(r.errores).toHaveLength(1);
    expect(r.errores[0]).toMatchObject({ fila: 2, columna: 'Facings_TG', letra: 'B' });
    expect(r.errores[0].motivo).toContain('más de un número');
  });

  it('enteros estrictos: decimales, texto y negativos son error', () => {
    for (const malo of ['10.5', '10 u.', '-3', 'abc']) {
      expect(hoja(['1', malo, null, null, null, null]).errores, malo).toHaveLength(1);
    }
    expect(hoja(['1', 101, null, null, null, null]).errores[0].motivo).toContain('fuera del rango');
  });

  it('una fila sin facings y sin ganchos se omite sin error', () => {
    const r = hoja(['1', null, null, null, null, null]);
    expect(r.errores).toEqual([]);
    expect(r.productos).toEqual([]);
    expect(r.filasOmitidas).toEqual([{ fila: 2, motivo: 'SKU 1: sin facings' }]);
  });

  it('facings vacío cuenta solo los ganchos normales', () => {
    const r = hoja(['1', null, null, null, 65, '54E']);
    expect(r.productos[0].facings_horizontal).toBe(1);
    expect(r.productos[0].ganchos).toEqual([65, '54E']);
  });

  it('facings vacío con solo ganchos de exhibición es error en Facings', () => {
    const r = hoja(['1', null, null, null, '54E', null]);
    expect(r.productos).toEqual([]);
    expect(r.errores).toHaveLength(1);
    expect(r.errores[0]).toMatchObject({ fila: 2, columna: 'Facings_TG', letra: 'B' });
  });

  it('un gancho con otra letra es error en su columna', () => {
    const r = hoja(['1', 2, null, null, '54A', null]);
    expect(r.errores[0]).toMatchObject({ columna: 'TG1', letra: 'E' });
  });

  it('un doble espacio en el nombre coincide con el catálogo normalizado', () => {
    const r = hoja(['1', 1, 'VDA-22R  PTH', null, 1, null]);
    expect(r.productos[0].accesorios[0].codigo).toBe('VDA-22R PTH');
    expect(erroresDeCatalogo(r.origenesAccesorio, new Set(['VDA-22R PTH']))).toEqual([]);
  });

  it('ordena los errores por fila y columna', () => {
    const r = hoja(['1', '1.5', null, null, '54A', null], ['2', 1, 'A // B', '1 // 2 // 3', null, null]);
    expect(r.errores.map((e) => [e.fila, e.letra])).toEqual([[2, 'B'], [2, 'E'], [3, 'D']]);
  });

  it('con errores no devuelve orígenes de accesorio', () => {
    const r = hoja(['1', 1, 'A', '22"', 1, null], ['2', '1.5', null, null, null, null]);
    expect(r.productos).toEqual([]);
    expect(r.origenesAccesorio).toEqual([]);
  });

  it('sin SKU se omite; sin la columna SKU o Facings se informa', () => {
    expect(hoja([null, 2, 'A', null, null, null]).filasOmitidas).toEqual([{ fila: 2, motivo: 'Sin SKU' }]);
    expect(interpretarHojaProductos([['Otra']]).columnasFaltantes).toEqual(['SKU']);
    expect(interpretarHojaProductos([['SKU']]).columnasFaltantes).toEqual(['facings']);
  });
});

describe('erroresDeCatalogo y agruparAccesorios', () => {
  it('un error por origen que no está en el catálogo', () => {
    const origenes = [
      { fila: 5, columna: 'Nombre_accesorio_TG', letra: 'C', codigo: 'X' },
      { fila: 7, columna: 'Nombre_accesorio_TG', letra: 'C', codigo: 'A' },
    ];
    const errores = erroresDeCatalogo(origenes, new Set(['A']));
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatchObject({ fila: 5, columna: 'Nombre_accesorio_TG' });
  });

  it('agrupa iguales consecutivos', () => {
    const A22 = { codigo: 'A', tamano_pulgadas: 22 };
    const B12 = { codigo: 'B', tamano_pulgadas: 12 };
    expect(agruparAccesorios([A22, A22, B12, A22])).toEqual([
      { ...A22, cantidad: 2 }, { ...B12, cantidad: 1 }, { ...A22, cantidad: 1 },
    ]);
  });
});
