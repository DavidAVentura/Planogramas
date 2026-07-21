import { httpClient } from './httpClient';
import type { DimensionesProducto, ProductoCatalogo, ProductoDetalle } from '../types/catalogo';

export const catalogoService = {
  buscarProductos: (q: string, opts: { subcategoria?: string; page?: number; pageSize?: number } = {}) =>
    httpClient.get<ProductoCatalogo[]>('/catalog/productos/buscar', { q, ...opts }),

  obtenerProducto: (sku: string) =>
    httpClient.get<ProductoDetalle>(`/catalog/productos/${encodeURIComponent(sku)}`),

  actualizarDimensiones: (sku: string, dimensiones: DimensionesProducto) =>
    httpClient.patch<ProductoDetalle>(`/catalog/productos/${encodeURIComponent(sku)}/dimensiones`, dimensiones),

  validarDimensiones: (sku: string) =>
    httpClient.patch<ProductoDetalle>(`/catalog/productos/${encodeURIComponent(sku)}/dimensiones/validar`),
};
