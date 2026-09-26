import { TIPOS_TIENDA } from '../../constants/tiendas';
import type { Tienda } from '../../types/tienda';

export type CampoOrdenTienda = 'codigo' | 'nombre' | 'tipo' | 'marca' | 'planogramas' | 'estado';
export type DireccionOrden = 'asc' | 'desc';

export interface CriterioOrden {
  campo: CampoOrdenTienda;
  dir: DireccionOrden;
}

/** Orden por defecto del contrato de GET /tiendas: nombre ASC. */
export const ORDEN_INICIAL: CriterioOrden[] = [{ campo: 'nombre', dir: 'asc' }];

// Clave de comparación por campo: tipo por tamaño de tienda (no alfabético), sin marca al final,
// activas antes que inactivas.
const VALOR_ORDEN: Record<CampoOrdenTienda, (t: Tienda) => string | number> = {
  codigo: (t) => t.codigo,
  nombre: (t) => t.nombre,
  tipo: (t) => TIPOS_TIENDA.indexOf(t.tipo),
  marca: (t) => t.marca ?? '￿',
  planogramas: (t) => t.planogramas,
  estado: (t) => (t.estado === 'activo' ? 0 : 1),
};

function comparar(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'es', { sensitivity: 'base' });
}

/**
 * Orden anidado: el primer criterio es el principal y los siguientes desempatan, en el orden en
 * que se eligieron. Empate total = orden por id, para que el resultado sea estable.
 */
export function ordenarTiendas(tiendas: Tienda[], orden: CriterioOrden[]): Tienda[] {
  return [...tiendas].sort((a, b) => {
    for (const { campo, dir } of orden) {
      const r = comparar(VALOR_ORDEN[campo](a), VALOR_ORDEN[campo](b));
      if (r !== 0) return dir === 'asc' ? r : -r;
    }
    return a.id - b.id;
  });
}

/**
 * Clic en un encabezado: si ya es el criterio principal, alterna asc/desc; si no, pasa a ser el
 * principal empezando en asc y el resto queda como desempate.
 */
export function alternarOrden(orden: CriterioOrden[], campo: CampoOrdenTienda): CriterioOrden[] {
  if (orden[0]?.campo === campo) {
    return [{ campo, dir: orden[0].dir === 'asc' ? 'desc' : 'asc' }, ...orden.slice(1)];
  }
  return [{ campo, dir: 'asc' }, ...orden.filter((o) => o.campo !== campo)];
}

export function esOrdenInicial(orden: CriterioOrden[]): boolean {
  const [inicial] = ORDEN_INICIAL;
  return orden.length === 1 && orden[0].campo === inicial.campo && orden[0].dir === inicial.dir;
}
