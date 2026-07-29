import { httpClient } from './httpClient';
import type {
  DimensionesProducto,
  FichaTecnicaCampo,
  InventarioSap,
  ProductoCatalogo,
  ProductoDetalle,
} from '../types/catalogo';

export const catalogoService = {
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
