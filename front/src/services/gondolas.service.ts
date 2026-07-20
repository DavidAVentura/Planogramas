import { httpClient } from './httpClient';
import type {
  Gondola,
  GondolaEditada,
  GondolaInput,
  GondolaListItem,
  GondolaResumen,
  OrdenGondola,
} from '../types/gondola';

export const gondolasService = {
  listarPorVersion: (versionId: number) =>
    httpClient.get<GondolaListItem[]>(`/versiones/${versionId}/gondolas`),

  agregar: (versionId: number, datos: GondolaInput) =>
    httpClient.post<Gondola>(`/versiones/${versionId}/gondolas`, datos),

  editar: (id: number, cambios: Partial<GondolaInput>) =>
    httpClient.patch<GondolaEditada>(`/gondolas/${id}`, cambios),

  reordenar: (versionId: number, orden: OrdenGondola[]) =>
    httpClient
      .patch<{ gondolas: OrdenGondola[] }>(`/versiones/${versionId}/gondolas/orden`, { orden })
      .then((r) => r.gondolas),

  obtenerResumen: (id: number) => httpClient.get<GondolaResumen>(`/gondolas/${id}/resumen`),

  eliminar: (id: number, forzar = false) => httpClient.delete<void>(`/gondolas/${id}`, { forzar }),
};
