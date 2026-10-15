import { describe, expect, it } from 'vitest';
import type { Gancho } from '../../../../types/gancho';
import type { CuerpoPdf, EspacioPdf, NivelPdf, ProductoPorUbicar } from '../../../../types/extractorPdfPlanograma';
import { construirCuerpoImportar, fuentePorUbicar, indicePorGancho, rangoGanchos } from './importacionPdf';

const espacio = (ganchos: Gancho[], orden = 1): EspacioPdf => ({
  orden_horizontal: orden,
  ganchos,
  facings: 1,
  ancho_cm: 10,
  sku_impreso: null,
  descripcion_visual: null,
  confianza: 0,
  producto: null,
  candidatos: [],
  estado_producto: 'NO_ENCONTRADO',
});

const nivel = (espacios: EspacioPdf[], codigo: string | null = null): NivelPdf => ({
  clave: 'n1',
  seccion_clave: null,
  orden: 1,
  altura_desde_piso_cm: 100,
  ancho_disponible_cm: 120,
  tipo_accesorio: 'GANCHO',
  codigo_accesorio: codigo,
  codigo_accesorio_id: null,
  tamano_accesorio_pulgadas: null,
  espacios,
});

const cuerpo = (niveles: NivelPdf[]): CuerpoPdf => ({
  clave: 'c1',
  nombre: 'TG-26 · cuerpo 1/1',
  codigo_mueble: 'TG-26',
  categoria: null,
  pagina: 1,
  ancho_cm: 120,
  alto_cm: 200,
  profundidad_cm: 40,
  secciones: [],
  niveles,
  accesorios_montaje: [],
  notas: null,
  advertencias: [],
});

const producto = (ganchos: Gancho[]): ProductoPorUbicar => ({ sku: '111', nombre: 'Producto', ganchos });

describe('rangoGanchos', () => {
  it('arma el rango de los normales y agrega los de exhibición aparte', () => {
    const uno9 = Array.from({ length: 9 }, (_, i) => espacio([i + 1], i + 1));
    expect(rangoGanchos(nivel(uno9))).toBe('1-9');
    expect(rangoGanchos(nivel([...uno9, espacio(['54E'], 10)]))).toBe('1-9, 54E');
    expect(rangoGanchos(nivel([espacio([54, '54E'])]))).toBe('54, 54E');
    expect(rangoGanchos(nivel([espacio(['54E', '55E'])]))).toBe('54E, 55E');
    expect(rangoGanchos(nivel([]))).toBe('—');
    expect(rangoGanchos(nivel([espacio([7])]))).toBe('7');
  });

  it('con tope termina en … sin cortar un token', () => {
    const n = nivel([espacio([1, '54E', '55E'])]);
    expect(rangoGanchos(n, 10)).toBe('1, 54E, …');
    expect(rangoGanchos(n, 1)).toBe('…');
  });
});

describe('construirCuerpoImportar', () => {
  it('notas ≤ 200 sin NaN y sin cortar tokens', () => {
    const espacios = Array.from({ length: 60 }, (_, i) => espacio([`${100 + i}E` as Gancho], i + 1));
    const notas = construirCuerpoImportar(cuerpo([nivel(espacios, 'R45-12-212P2')]), { destino: 'NUEVA', nombre: '' }, {}, 'a.pdf').niveles[0].notas!;
    expect(notas.length).toBeLessThanOrEqual(200);
    expect(notas.endsWith('…')).toBe(true);
    expect(notas).not.toContain('NaN');
    const lista = notas.split('ganchos ')[1].replace(/, …$/, '').split(', ');
    lista.forEach((t) => expect(t).toMatch(/^\d+E$/));
  });

  it('conserva los ganchos mixtos en la posición', () => {
    const c = construirCuerpoImportar(cuerpo([nivel([espacio([54, '54E'])])]), { destino: 'NUEVA', nombre: '' }, {}, 'a.pdf');
    expect(c.niveles[0].posiciones[0].ganchos).toEqual([54, '54E']);
  });
});

describe('fuentePorUbicar', () => {
  it('el cruce es exacto en la forma canónica', () => {
    const p = producto([65, '54E']);
    expect(fuentePorUbicar(espacio(['54E']), indicePorGancho([p]))).toBe(p);
    expect(fuentePorUbicar(espacio([54]), indicePorGancho([producto(['54E'])]))).toBeNull();
    expect(fuentePorUbicar(espacio(['54E']), indicePorGancho([producto([54])]))).toBeNull();
  });
});
