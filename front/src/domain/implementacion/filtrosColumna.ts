// Filtros por columna de la tabla Productos del Implementador. Funciones puras: sin React ni DOM.

/** Minúsculas y sin acentos, para comparar "Góndola" con "gondola". */
export function normalizarTexto(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** `true` si `texto` contiene `buscado` sin distinguir mayúsculas ni acentos. `buscado` vacío = todo. */
export function contieneTexto(texto: string, buscado: string): boolean {
  const q = normalizarTexto(buscado.trim());
  return !q || normalizarTexto(texto).includes(q);
}

export type PruebaNumerica = (valor: number) => boolean;

const NUMERO = String.raw`(\d+(?:[.,]\d+)?)`;
const RANGO = new RegExp(String.raw`^${NUMERO}\s*-\s*${NUMERO}$`);
const COMPARACION = new RegExp(String.raw`^(>=|<=|>|<|=)?\s*${NUMERO}$`);

const aNumero = (t: string) => Number(t.replace(',', '.'));

/**
 * Interpreta la expresión de un filtro numérico: `3` (igual), `>2`, `>=2`, `<5`, `<=5`, `=3` o un
 * rango inclusivo `1-4` (en cualquier orden, `4-1` equivale a `1-4`). Devuelve `null` si la
 * expresión no se entiende, para que la vista marque el campo como inválido.
 */
export function parsearFiltroNumerico(expresion: string): PruebaNumerica | null {
  const t = expresion.trim();
  if (!t) return null;

  const rango = t.match(RANGO);
  if (rango) {
    const [min, max] = [aNumero(rango[1]), aNumero(rango[2])].sort((a, b) => a - b);
    return (v) => v >= min && v <= max;
  }

  const comparacion = t.match(COMPARACION);
  if (!comparacion) return null;
  const n = aNumero(comparacion[2]);
  switch (comparacion[1]) {
    case '>':
      return (v) => v > n;
    case '<':
      return (v) => v < n;
    case '>=':
      return (v) => v >= n;
    case '<=':
      return (v) => v <= n;
    default:
      return (v) => v === n;
  }
}
