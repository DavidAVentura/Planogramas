import { httpClient } from './httpClient';
import type { ProductoCatalogo, ProductoDetalle } from '../types/catalogo';

export const catalogoService = {
  buscarProductos: (q: string, opts: { subcategoria?: string; page?: number; pageSize?: number } = {}) =>
    httpClient.get<ProductoCatalogo[]>('/catalog/productos/buscar', { q, ...opts }),

  obtenerProducto: (sku: string) =>
    httpClient.get<ProductoDetalle>(`/catalog/productos/${encodeURIComponent(sku)}`),
};
