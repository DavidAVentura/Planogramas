import { httpClient } from './httpClient';
import type {
  DimensionesProducto,
  FichaTecnicaCampo,
  InventarioSap,
  ProductoCatalogo,
  ProductoDetalle,
} from '../types/catalogo';
import type { AparicionProducto, FiltroJerarquia, ProductoListado } from '../types/producto';

export const catalogoService = {
  /** Productos de la tabla local; el backend usa solo el nivel de jerarquía más específico. */
  listarProductos: (jerarquia: Partial<FiltroJerarquia> = {}) =>
    httpClient.get<ProductoListado[]>('/catalog/productos', { ...jerarquia }),

  obtenerPlanogramasDeProducto: (sku: string) =>
    httpClient.get<AparicionProducto[]>(`/catalog/productos/${encodeURIComponent(sku)}/planogramas`),

  buscarProductos: (q: string, opts: { subcategoria?: string; page?: number; pageSize?: number } = {}) =>
    httpClient.get<ProductoCatalogo[]>('/catalog/productos/buscar', { q, ...opts }),

  obtenerProducto: (sku: string) =>
    httpClient.get<ProductoDetalle>(`/catalog/productos/${encodeURIComponent(sku)}`),

  obtenerStock: (sku: string) =>
    httpClient.get<InventarioSap[]>(`/catalog/productos/${encodeURIComponent(sku)}/stock`),

  obtenerFichaTecnica: (sku: string) =>
    httpClient.get<FichaTecnicaCampo[]>(`/catalog/productos/${encodeURIComponent(sku)}/ficha-tecnica`),

  actualizarDimensiones: (sku: string, dimensiones: DimensionesProducto) =>
    httpClient.patch<ProductoDetalle>(`/catalog/productos/${encodeURIComponent(sku)}/dimensiones`, dimensiones),

  validarDimensiones: (sku: string) =>
    httpClient.patch<ProductoDetalle>(`/catalog/productos/${encodeURIComponent(sku)}/dimensiones/validar`),
};
