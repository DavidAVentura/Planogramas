import type { ProductoListado } from '../../types/producto';

export type CampoOrdenProducto = 'sku' | 'nombre' | 'jerarquia' | 'planogramas' | 'estado';
export type DireccionOrden = 'asc' | 'desc';

export interface CriterioOrden {
  campo: CampoOrdenProducto;
  dir: DireccionOrden;
}

export const ORDEN_INICIAL: CriterioOrden[] = [{ campo: 'nombre', dir: 'asc' }];

// Sin dato de jerarquía va al final en orden ascendente; activos antes que inactivos.
const AL_FINAL = '￿';
const VALOR_ORDEN: Record<CampoOrdenProducto, (p: ProductoListado) => string | number> = {
  sku: (p) => p.sku,
  nombre: (p) => p.nombre,
  jerarquia: (p) =>
    [p.categoria_nivel1, p.categoria_nivel2, p.subcategoria].map((n) => n ?? AL_FINAL).join('|'),
  planogramas: (p) => p.planogramas,
  estado: (p) => (p.estado === 'activo' ? 0 : 1),
};

function comparar(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a === b ? 0 : a < b ? -1 : 1;
  // `numeric` ordena SKUs como números ("98" antes que "724813").
  return String(a).localeCompare(String(b), 'es', { sensitivity: 'base', numeric: true });
}

/**
 * Orden anidado: el primer criterio es el principal y los siguientes desempatan, en el orden en
 * que se eligieron. Empate total = orden por SKU, para que el resultado sea estable.
 */
export function ordenarProductos(productos: ProductoListado[], orden: CriterioOrden[]): ProductoListado[] {
  return [...productos].sort((a, b) => {
    for (const { campo, dir } of orden) {
      const r = comparar(VALOR_ORDEN[campo](a), VALOR_ORDEN[campo](b));
      if (r !== 0) return dir === 'asc' ? r : -r;
    }
    return comparar(a.sku, b.sku);
  });
}

/**
 * Clic en un encabezado: si ya es el criterio principal, alterna asc/desc; si no, pasa a ser el
 * principal empezando en asc y el resto queda como desempate.
 */
export function alternarOrden(orden: CriterioOrden[], campo: CampoOrdenProducto): CriterioOrden[] {
  if (orden[0]?.campo === campo) {
    return [{ campo, dir: orden[0].dir === 'asc' ? 'desc' : 'asc' }, ...orden.slice(1)];
  }
  return [{ campo, dir: 'asc' }, ...orden.filter((o) => o.campo !== campo)];
}

export function esOrdenInicial(orden: CriterioOrden[]): boolean {
  const [inicial] = ORDEN_INICIAL;
  return orden.length === 1 && orden[0].campo === inicial.campo && orden[0].dir === inicial.dir;
}
