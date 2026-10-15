import { describe, expect, it } from 'vitest';
import { normalizarCodigoAccesorio } from './codigoAccesorio';

describe('normalizarCodigoAccesorio', () => {
  it('recorta, colapsa espacios y pasa a mayúsculas', () => {
    expect(normalizarCodigoAccesorio(' vda-22r  pth ')).toBe('VDA-22R PTH');
    expect(normalizarCodigoAccesorio('A\tB')).toBe('A B');
    expect(normalizarCodigoAccesorio('')).toBe('');
  });
});
