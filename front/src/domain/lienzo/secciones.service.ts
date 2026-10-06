/**
 * Geometría del árbol de secciones de una góndola (mismo cálculo que `seccion.entity.js` en el
 * backend): cada división reparte su espacio entre sus hijas y la última toma lo que sobre.
 */
import type { NodoSeccion } from '../../types/seccion';

export interface RectanguloCm {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/** Rectángulo (cm, desde la esquina superior izquierda) de TODOS los nodos, hojas y divisiones. */
export function rectangulosDeNodos(raiz: NodoSeccion, anchoCm: number, altoCm: number): Map<number, RectanguloCm> {
  const mapa = new Map<number, RectanguloCm>();
  (function recorrer(nodo: NodoSeccion, x: number, y: number, ancho: number, alto: number) {
    mapa.set(nodo.id, { x, y, ancho, alto });
    if (!nodo.esDivision) return;
    const total = nodo.direccion === 'COLUMNAS' ? ancho : alto;
    let usado = 0;
    nodo.hijos.forEach((hijo, i) => {
      const tam = i === nodo.hijos.length - 1 ? Math.max(0, total - usado) : hijo.tamCm;
      if (nodo.direccion === 'COLUMNAS') recorrer(hijo, x + usado, y, tam, alto);
      else recorrer(hijo, x, y + usado, ancho, tam);
      usado += tam;
    });
  })(raiz, 0, 0, anchoCm, altoCm);
  return mapa;
}

export interface FranjaNivel<N> {
  nivel: N;
  /** Altura desde el piso (cm) de la base del nivel (la repisa o la línea de ganchos). */
  baseCm: number;
  /** Altura desde el piso (cm) hasta donde llega su espacio (la base del nivel de arriba o el techo de la sección). */
  techoCm: number;
}

/**
 * Espacio vertical de cada nivel dentro de una sección. `niveles` va en orden visual (de arriba
 * hacia abajo). Si sus alturas desde el piso son coherentes (bajan de arriba hacia abajo y caen
 * dentro de la sección) se usan tal cual: cada nivel ocupa desde su base hasta la base del de
 * arriba. Si no, el alto de la sección se reparte en partes iguales y `repartidas` avisa que las
 * alturas guardadas no sirven para dibujar.
 */
export function distribuirNiveles<N extends { alturaDesdePisoCm: number }>(
  niveles: N[],
  pisoCm: number,
  techoCm: number,
): { franjas: FranjaNivel<N>[]; repartidas: boolean } {
  const coherentes =
    niveles.length > 0 &&
    niveles.every((n, i) => {
      const dentro = n.alturaDesdePisoCm >= pisoCm && n.alturaDesdePisoCm < techoCm;
      return dentro && (i === 0 || n.alturaDesdePisoCm < niveles[i - 1].alturaDesdePisoCm);
    });

  if (coherentes) {
    return {
      repartidas: false,
      franjas: niveles.map((n, i) => ({ nivel: n, baseCm: n.alturaDesdePisoCm, techoCm: i === 0 ? techoCm : niveles[i - 1].alturaDesdePisoCm })),
    };
  }

  const alto = (techoCm - pisoCm) / Math.max(1, niveles.length);
  return {
    repartidas: niveles.length > 0,
    franjas: niveles.map((n, i) => ({ nivel: n, techoCm: techoCm - i * alto, baseCm: techoCm - (i + 1) * alto })),
  };
}

/** Nodos desde la raíz hasta `id` (inclusive), o [] si no está. */
export function rutaHasta(raiz: NodoSeccion, id: number): NodoSeccion[] {
  if (raiz.id === id) return [raiz];
  for (const hijo of raiz.hijos) {
    const ruta = rutaHasta(hijo, id);
    if (ruta.length) return [raiz, ...ruta];
  }
  return [];
}

/**
 * Nodo cuya medida controla el ancho (o el alto) de una hoja: el ancestro más cercano (o ella
 * misma) cuyo padre reparte en esa dirección. null = ocupa todo el ancho/alto de la góndola.
 */
export function nodoQueControla(raiz: NodoSeccion, hojaId: number, direccion: 'COLUMNAS' | 'FILAS'): NodoSeccion | null {
  const ruta = rutaHasta(raiz, hojaId);
  for (let i = ruta.length - 1; i > 0; i--) {
    if (ruta[i - 1].direccion === direccion) return ruta[i];
  }
  return null;
}
