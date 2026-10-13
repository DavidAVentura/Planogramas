import { describe, expect, it } from 'vitest';
import { calcularAnchoAsignado, calcularCapacidadMaxima, calcularMinEstetico } from './posicionCalculos';

describe('posicionCalculos', () => {
  it('ancho asignado = facings × ancho del producto; sin dato conserva el actual', () => {
    expect(calcularAnchoAsignado(3, 12.5, 20)).toBe(37.5);
    expect(calcularAnchoAsignado(3, null, 20)).toBe(20);
    expect(calcularAnchoAsignado(0, 12, 20)).toBe(20);
  });

  it('capacidad máxima = facings × apilable × unidades por facing', () => {
    expect(calcularCapacidadMaxima(2, 3, 4)).toBe(24);
  });

  it('min estético = 3×facings+1 con empaques de 4 o más; si no, la capacidad máxima', () => {
    expect(calcularMinEstetico(2, 4, 24)).toBe(7);
    expect(calcularMinEstetico(2, 3, 18)).toBe(18);
  });
});
