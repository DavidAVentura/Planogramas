import { describe, expect, it } from 'vitest';
import { formatearAutor } from './autorCarga';

describe('formatearAutor', () => {
  it('nombre y número: Nombre (#código) en tipo título', () => {
    expect(formatearAutor('10234', 'JUAN LÓPEZ')).toBe('Juan López (#10234)');
  });

  it('sin nombre: solo #código', () => {
    expect(formatearAutor('10234', null)).toBe('#10234');
    expect(formatearAutor('10234', undefined)).toBe('#10234');
    expect(formatearAutor('10234', '')).toBe('#10234');
    expect(formatearAutor('10234', '   ')).toBe('#10234');
  });

  it('nombre igual al número: solo #código', () => {
    expect(formatearAutor('10234', '10234')).toBe('#10234');
  });

  it('autor heredado no numérico sin nombre: el valor tal cual', () => {
    expect(formatearAutor('sistema', null)).toBe('sistema');
  });

  it('número no numérico con nombre: Nombre (código)', () => {
    expect(formatearAutor('jlopez', 'JUAN LÓPEZ')).toBe('Juan López (jlopez)');
  });

  it('partículas en minúscula salvo la primera palabra', () => {
    expect(formatearAutor('1', 'JUAN DE LA CRUZ')).toBe('Juan de la Cruz (#1)');
    expect(formatearAutor('1', 'DE LA ROSA PEREZ')).toBe('De la Rosa Perez (#1)');
  });

  it('conserva tildes y ñ', () => {
    expect(formatearAutor('1', 'MUÑOZ ÁLVAREZ')).toBe('Muñoz Álvarez (#1)');
  });

  it('un nombre con HTML sale como texto literal', () => {
    expect(formatearAutor('1', '<img src=x onerror=alert(1)>')).toBe('<img Src=x Onerror=alert(1)> (#1)');
  });
});
