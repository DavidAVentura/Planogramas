import { describe, expect, it } from 'vitest';
import {
  compararGanchos, esGanchoExhibicion, leerGancho, leerListaGanchos, numeroGancho, textoGancho, textoGanchos,
} from './gancho';

describe('leerGancho', () => {
  it('normaliza a la forma canónica', () => {
    expect(leerGancho(54)).toBe(54);
    expect(leerGancho('54')).toBe(54);
    expect(leerGancho('054')).toBe(54);
    expect(leerGancho('054E')).toBe('54E');
    expect(leerGancho('54e')).toBe('54E');
    expect(leerGancho(' 54E ')).toBe('54E');
  });

  it('rechaza lo que no es canónico', () => {
    for (const malo of [0, '0E', -1, 54.5, '54A', 'E', '1234567', '5E1', '1e2', '54E2', '+54', '54.0', true, null, undefined, 1000000]) {
      expect(leerGancho(malo), String(malo)).toBeNull();
    }
  });
});

describe('orden y texto', () => {
  it('compara por número y el normal antes que el de exhibición', () => {
    expect([65, '54E', 54, '5E'].sort(compararGanchos)).toEqual(['5E', 54, '54E', 65]);
    expect(numeroGancho('54E')).toBe(54);
    expect(esGanchoExhibicion('54E')).toBe(true);
    expect(esGanchoExhibicion(54)).toBe(false);
  });

  it('textoGancho rellena a 2 dígitos y conserva la E', () => {
    expect(textoGancho(5)).toBe('05');
    expect(textoGancho('5E')).toBe('05E');
    expect(textoGancho('54E')).toBe('54E');
    expect(textoGancho(132)).toBe('132');
  });

  it('textoGanchos arma rangos solo entre normales', () => {
    expect(textoGanchos([4, 5, 6])).toBe('04–06');
    expect(textoGanchos([4, '5E'])).toBe('04, 05E');
    expect(textoGanchos([65, '54E'])).toBe('65, 54E');
    expect(textoGanchos(['54E'])).toBe('54E');
  });
});

describe('leerListaGanchos', () => {
  it('une 54 E y acepta separadores comunes', () => {
    expect(leerListaGanchos('4, 9 54 e')).toEqual({ ganchos: [4, 9, '54E'], invalidos: [] });
  });

  it('marca inválidos y repetidos', () => {
    expect(leerListaGanchos('4, x, 4')).toEqual({ ganchos: [4], invalidos: ['x', '4 (repetido)'] });
  });
});
