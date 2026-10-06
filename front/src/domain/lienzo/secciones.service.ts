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
