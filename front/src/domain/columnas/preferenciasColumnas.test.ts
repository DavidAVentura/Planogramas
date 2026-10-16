import { describe, expect, it } from 'vitest';
import {
  alternarVisibilidadBase,
  columnasVisibles,
  moverColumna,
  soltarColumna,
  validarOrdenVisibilidad,
} from './preferenciasColumnas';

const CLAVES = ['a', 'b', 'c', 'd'] as const;

describe('validarOrdenVisibilidad', () => {
  it('sin datos devuelve el orden base y las ocultas iniciales', () => {
    expect(validarOrdenVisibilidad(null, CLAVES, ['d'])).toEqual({ orden: ['a', 'b', 'c', 'd'], ocultas: ['d'] });
    expect(validarOrdenVisibilidad('x', CLAVES, [])).toEqual({ orden: ['a', 'b', 'c', 'd'], ocultas: [] });
  });

  it('descarta claves desconocidas y repetidas', () => {
    const r = validarOrdenVisibilidad({ orden: ['c', 'zzz', 'c', 'a', 7, '__proto__'], ocultas: ['inventario', 'b', 'b'] }, CLAVES, []);
    expect(r.orden).toEqual(['c', 'a', 'b', 'd']);
    expect(r.ocultas).toEqual(['b']);
  });

  it('agrega al final las columnas nuevas', () => {
    expect(validarOrdenVisibilidad({ orden: ['b', 'a'], ocultas: [] }, CLAVES, []).orden).toEqual(['b', 'a', 'c', 'd']);
  });

  it('no permite ocultar todas las columnas', () => {
    expect(validarOrdenVisibilidad({ orden: [...CLAVES], ocultas: [...CLAVES] }, CLAVES, []).ocultas).toEqual([]);
  });

  it('tolera tipos incorrectos', () => {
    expect(validarOrdenVisibilidad({ orden: 'a', ocultas: 5 }, CLAVES, ['c'])).toEqual({ orden: ['a', 'b', 'c', 'd'], ocultas: [] });
  });
});

describe('moverColumna', () => {
  it('mueve y respeta los límites', () => {
    expect(moverColumna(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b']);
    expect(moverColumna(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
  });

  it('fuera de rango o clave inexistente: sin cambio', () => {
    const orden = ['a', 'b', 'c'];
    expect(moverColumna(orden, 'a', -1)).toBe(orden);
    expect(moverColumna(orden, 'c', 1)).toBe(orden);
    expect(moverColumna(orden, 'z', 1)).toBe(orden);
  });
});

describe('soltarColumna', () => {
  it('desde la izquierda queda después del destino', () => {
    expect(soltarColumna(['a', 'b', 'c', 'd'], 'a', 'c')).toEqual(['b', 'c', 'a', 'd']);
  });

  it('desde la derecha queda antes del destino', () => {
    expect(soltarColumna(['a', 'b', 'c', 'd'], 'd', 'b')).toEqual(['a', 'd', 'b', 'c']);
  });

  it('sobre sí misma o con claves ajenas: sin cambio', () => {
    const orden = ['a', 'b'];
    expect(soltarColumna(orden, 'a', 'a')).toBe(orden);
    expect(soltarColumna(orden, 'a', 'z')).toBe(orden);
  });
});

describe('visibilidad', () => {
  it('oculta, muestra y no deja ocultar la última visible', () => {
    const base = { orden: ['a', 'b'], ocultas: [] as string[] };
    const sinA = alternarVisibilidadBase(base, 'a');
    expect(sinA.ocultas).toEqual(['a']);
    expect(columnasVisibles(sinA)).toEqual(['b']);
    expect(alternarVisibilidadBase(sinA, 'b')).toBe(sinA);
    expect(alternarVisibilidadBase(sinA, 'a').ocultas).toEqual([]);
  });

  it('conserva los demás campos de las preferencias', () => {
    const r = alternarVisibilidadBase({ orden: ['a', 'b'], ocultas: [] as string[], extra: 1 }, 'a');
    expect(r.extra).toBe(1);
  });
});
