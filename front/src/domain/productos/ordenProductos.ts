import type { ProductoListado } from '../../types/producto';
import {
  alternarOrden as alternarOrdenAnidado,
  compararValores,
  ordenarAnidado,
  type CriterioOrden as CriterioOrdenGenerico,
} from '../orden/ordenAnidado';

export type { DireccionOrden } from '../orden/ordenAnidado';

export type CampoOrdenProducto = 'sku' | 'nombre' | 'jerarquia' | 'planogramas' | 'estado';

export type CriterioOrden = CriterioOrdenGenerico<CampoOrdenProducto>;

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

/**
 * Orden anidado: el primer criterio es el principal y los siguientes desempatan, en el orden en
 * que se eligieron. Empate total = orden por SKU, para que el resultado sea estable.
 */
export function ordenarProductos(productos: ProductoListado[], orden: CriterioOrden[]): ProductoListado[] {
  return ordenarAnidado(productos, orden, (p, campo) => VALOR_ORDEN[campo](p), (a, b) =>
    compararValores(a.sku, b.sku),
  );
}

/** Ver `alternarOrden` en `domain/orden/ordenAnidado.ts`. */
export function alternarOrden(orden: CriterioOrden[], campo: CampoOrdenProducto): CriterioOrden[] {
  return alternarOrdenAnidado(orden, campo);
}

export function esOrdenInicial(orden: CriterioOrden[]): boolean {
  const [inicial] = ORDEN_INICIAL;
  return orden.length === 1 && orden[0].campo === inicial.campo && orden[0].dir === inicial.dir;
}
