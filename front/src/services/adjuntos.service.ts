import { httpClient } from './httpClient';
import type { Adjunto, AgregarAdjuntoInput } from '../types/adjunto';

export const adjuntosService = {
  listarPorVersion: (versionId: number) => httpClient.get<Adjunto[]>(`/versiones/${versionId}/adjuntos`),

  agregar: (versionId: number, datos: AgregarAdjuntoInput) =>
    httpClient.post<Adjunto>(`/versiones/${versionId}/adjuntos`, datos),

  reemplazar: (id: number, datos: AgregarAdjuntoInput) =>
    httpClient.put<Adjunto>(`/adjuntos/${id}`, datos),

  eliminar: (id: number) => httpClient.delete<void>(`/adjuntos/${id}`),

  /** El contenedor de Azure es privado — la descarga siempre pasa por este endpoint del backend,
   * nunca por `blobUrl` directo. Se pide vía httpClient (no con un `<a href>`) porque el
   * endpoint exige el header Authorization. */
  descargar: (id: number) => httpClient.getBinario(`/adjuntos/${id}/descargar`),
};
