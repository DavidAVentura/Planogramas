// Orden anidado por clic en encabezado, compartido por las tablas que lo usan (Productos del
// analista, Productos del Implementador): la última columna clickeada es la clave principal y las
// anteriores desempatan en el orden en que se eligieron.

export type DireccionOrden = 'asc' | 'desc';

export interface CriterioOrden<C extends string> {
  campo: C;
  dir: DireccionOrden;
}

export type ValorOrdenable = string | number | null;

/**
 * Compara dos claves de orden. `numeric` ordena SKUs y nombres con números como números
 * ("98" antes que "724813", "Góndola 2" antes que "Góndola 10"). `null` (sin dato) va al final en
 * ascendente.
 */
export function compararValores(a: ValorOrdenable, b: ValorOrdenable): number {
  if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
  if (typeof a === 'number' && typeof b === 'number') return a === b ? 0 : a < b ? -1 : 1;
  return String(a).localeCompare(String(b), 'es', { sensitivity: 'base', numeric: true });
}

/**
 * Clic en un encabezado: si ya es el criterio principal, alterna asc/desc; si no, pasa a ser el
 * principal empezando en asc y el resto queda como desempate.
 */
export function alternarOrden<C extends string>(orden: CriterioOrden<C>[], campo: C): CriterioOrden<C>[] {
  if (orden[0]?.campo === campo) {
    return [{ campo, dir: orden[0].dir === 'asc' ? 'desc' : 'asc' }, ...orden.slice(1)];
  }
  return [{ campo, dir: 'asc' }, ...orden.filter((o) => o.campo !== campo)];
}

/**
 * Ordena una copia de `filas` según los criterios. Con empate total decide `desempate`; si no se
 * pasa, se conserva el orden de entrada (el sort de JS es estable).
 */
export function ordenarAnidado<T, C extends string>(
  filas: T[],
  orden: CriterioOrden<C>[],
  valor: (fila: T, campo: C) => ValorOrdenable,
  desempate?: (a: T, b: T) => number,
): T[] {
  return [...filas].sort((a, b) => {
    for (const { campo, dir } of orden) {
      const r = compararValores(valor(a, campo), valor(b, campo));
      if (r !== 0) return dir === 'asc' ? r : -r;
    }
    return desempate ? desempate(a, b) : 0;
  });
}

/** "SKU ↑  ›  Nivel ↓" */
export function resumirOrden<C extends string>(orden: CriterioOrden<C>[], nombre: (campo: C) => string): string {
  return orden.map((o) => `${nombre(o.campo)} ${o.dir === 'asc' ? '↑' : '↓'}`).join('  ›  ');
}
