import { httpClient } from './httpClient';
import type { ProductosImplementacion, ResumenImplementacion } from '../types/implementacion';

export const implementacionService = {
  /** Versiones asignadas a la tienda con su inventario y evidencia (vista Mi tienda). */
  resumen: (tiendaId: number) => httpClient.get<ResumenImplementacion>(`/tiendas/${tiendaId}/implementacion`),

  /** Una fila por posición de las versiones asignadas. Sin `versionIds`: todas las de la tienda. */
  productos: (tiendaId: number, versionIds?: number[]) =>
    httpClient.get<ProductosImplementacion>(`/tiendas/${tiendaId}/implementacion/productos`, {
      versionIds: versionIds?.length ? versionIds.join(',') : undefined,
    }),
};
