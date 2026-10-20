import { httpClient } from './httpClient';
import type {
  CuerpoExportacionPorVersion,
  ProductosImplementacion,
  ProductosPorVersion,
  ResumenImplementacion,
  VersionPorVersion,
} from '../types/implementacion';

/** Jerarquía de CATI que acota Por versión: solo Área y Departamento. */
export interface JerarquiaPorVersion {
  area?: string;
  departamento?: string;
}

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

  /**
   * Por versión (Analista): filas de las versiones; la tienda es opcional y solo agrega inventario y
   * la jerarquía (Área › Departamento, CATI) acota las filas. Sin jerarquía la petición es la de siempre.
   */
  productosPorVersion: (versionIds: number[], tiendaId: number | null, jerarquia: JerarquiaPorVersion = {}) =>
    httpClient.get<ProductosPorVersion>('/implementacion/productos', {
      versionIds: versionIds.join(','),
      tiendaId: tiendaId ?? undefined,
      area: jerarquia.area || undefined,
      departamento: jerarquia.departamento || undefined,
    }),

  /** Por versión (Analista): descarga el .xlsx (Lista o Pivote) generado en el servidor. */
  descargarProductosPorVersion: (cuerpo: CuerpoExportacionPorVersion) =>
    httpClient.postBinario('/implementacion/productos/exportar', cuerpo),
};
