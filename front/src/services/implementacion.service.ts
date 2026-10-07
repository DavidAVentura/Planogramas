import { httpClient } from './httpClient';
import type {
  ProductosImplementacion,
  ProductosPorVersion,
  ResumenImplementacion,
  VersionPorVersion,
} from '../types/implementacion';

export const implementacionService = {
  /** Versiones asignadas a la tienda con su inventario y evidencia (vista Mi tienda). */
  resumen: (tiendaId: number) => httpClient.get<ResumenImplementacion>(`/tiendas/${tiendaId}/implementacion`),

  /** Una fila por posición de las versiones asignadas. Sin `versionIds`: todas las de la tienda. */
  productos: (tiendaId: number, versionIds?: number[]) =>
    httpClient.get<ProductosImplementacion>(`/tiendas/${tiendaId}/implementacion/productos`, {
      versionIds: versionIds?.length ? versionIds.join(',') : undefined,
    }),

  /** Por versión (Analista): publicadas y piloto de todos los planogramas, más las de `incluir`. */
  versionesPorVersion: (incluir: number[]) =>
    httpClient.get<{ data: VersionPorVersion[] }>('/implementacion/versiones', {
      incluir: incluir.length ? incluir.join(',') : undefined,
    }),

  /** Por versión (Analista): filas de las versiones; la tienda es opcional y solo agrega inventario. */
  productosPorVersion: (versionIds: number[], tiendaId: number | null) =>
    httpClient.get<ProductosPorVersion>('/implementacion/productos', {
      versionIds: versionIds.join(','),
      tiendaId: tiendaId ?? undefined,
    }),
};
