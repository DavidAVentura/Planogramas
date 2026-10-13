import { describe, expect, it } from 'vitest';
import { alternarOrden, compararValores, ordenarAnidado, type CriterioOrden } from './ordenAnidado';

type Campo = 'sku' | 'nivel';

describe('ordenAnidado', () => {
  it('compara números dentro de textos como números y manda null al final', () => {
    expect(compararValores('Góndola 2', 'Góndola 10')).toBeLessThan(0);
    expect(compararValores('98', '724813')).toBeLessThan(0);
    expect(compararValores(null, 'a')).toBe(1);
    expect(compararValores(null, null)).toBe(0);
  });

  it('clic en el criterio principal alterna asc/desc; otro campo pasa a ser principal', () => {
    const inicial: CriterioOrden<Campo>[] = [{ campo: 'sku', dir: 'asc' }];
    expect(alternarOrden(inicial, 'sku')).toEqual([{ campo: 'sku', dir: 'desc' }]);
    expect(alternarOrden(inicial, 'nivel')).toEqual([
      { campo: 'nivel', dir: 'asc' },
      { campo: 'sku', dir: 'asc' },
    ]);
  });

  it('ordena por el criterio principal y desempata con los anteriores', () => {
    const filas = [
      { sku: 'B', nivel: 1 },
      { sku: 'A', nivel: 2 },
      { sku: 'C', nivel: 1 },
    ];
    const orden: CriterioOrden<Campo>[] = [{ campo: 'nivel', dir: 'asc' }, { campo: 'sku', dir: 'desc' }];
    const res = ordenarAnidado(filas, orden, (f, c) => f[c]);
    expect(res.map((f) => f.sku)).toEqual(['C', 'B', 'A']);
    expect(filas[0].sku).toBe('B'); // no muta la entrada
  });
});
