/** Única regla de ganchos del front (misma semántica que `back/src/domain/compartido/gancho.js`).
 * Forma canónica: número (normal, 54) o texto "<n>E" (exhibición, "54E"), n entero 1..999999.
 * `54` y `"54E"` son ganchos distintos. */

import type { Gancho } from '../../types/gancho';

const MAXIMO_GANCHO = 999999;
const PATRON_TEXTO = /^0*([1-9]\d{0,5})(E?)$/;

/** Devuelve el gancho en forma canónica o `null` si no es válido. */
export function leerGancho(valor: unknown): Gancho | null {
  if (typeof valor === 'number') {
    return Number.isInteger(valor) && valor >= 1 && valor <= MAXIMO_GANCHO ? valor : null;
  }
  if (typeof valor !== 'string') return null;
  const m = PATRON_TEXTO.exec(valor.trim().toUpperCase());
  if (!m) return null;
  const numero = Number(m[1]);
  return m[2] ? `${numero}E` : numero;
}

export function numeroGancho(g: Gancho): number {
  return typeof g === 'number' ? g : parseInt(g, 10);
}

export function esGanchoExhibicion(g: Gancho): boolean {
  return typeof g === 'string';
}

/** Por número; a igual número, el normal antes que el de exhibición. */
export function compararGanchos(a: Gancho, b: Gancho): number {
  return (numeroGancho(a) - numeroGancho(b)) || (Number(esGanchoExhibicion(a)) - Number(esGanchoExhibicion(b)));
}

/** `5` → `05`, `"5E"` → `05E`, `"54E"` → `54E`, `132` → `132`. */
export function textoGancho(g: Gancho): string {
  return String(numeroGancho(g)).padStart(2, '0') + (esGanchoExhibicion(g) ? 'E' : '');
}

/** Uno → `05`; todos normales y continuos → `04–07`; si no, separados por coma. */
export function textoGanchos(ganchos: Gancho[]): string {
  if (ganchos.length === 1) return textoGancho(ganchos[0]);
  const continuos = ganchos.length > 1
    && ganchos.every((g, i) => !esGanchoExhibicion(g) && (i === 0 || numeroGancho(g) === numeroGancho(ganchos[i - 1]) + 1));
  if (continuos) return `${textoGancho(ganchos[0])}–${textoGancho(ganchos[ganchos.length - 1])}`;
  return ganchos.map(textoGancho).join(', ');
}

/** Lee la lista de ganchos que escribe el usuario (`4, 9 54 e`); los repetidos se marcan como inválidos. */
export function leerListaGanchos(texto: string): { ganchos: Gancho[]; invalidos: string[] } {
  const ganchos: Gancho[] = [];
  const invalidos: string[] = [];
  const tokens = texto.replace(/(\d)\s+E/gi, '$1E').split(/[\s,;|]+/).filter(Boolean);
  for (const token of tokens) {
    const g = leerGancho(token);
    if (g === null) invalidos.push(token);
    else if (ganchos.includes(g)) invalidos.push(`${token} (repetido)`);
    else ganchos.push(g);
  }
  return { ganchos, invalidos };
}
