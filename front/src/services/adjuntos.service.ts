import { httpClient } from './httpClient';
import type {
  Adjunto,
  ConfirmarAdjuntoInput,
  ModoDescargaAdjunto,
  SolicitarSubidaAdjuntoInput,
  SubidaAdjunto,
  UrlDescargaAdjunto,
} from '../types/adjunto';

// El archivo no viaja por la API: se pide una URL SAS (`solicitarSubida*`), el navegador sube
// directo a Azure (utils/adjuntoArchivo.ts) y después se confirma (`agregar` / `reemplazar`).
export const adjuntosService = {
  listarPorVersion: (versionId: number) => httpClient.get<Adjunto[]>(`/versiones/${versionId}/adjuntos`),

  solicitarSubida: (versionId: number, datos: SolicitarSubidaAdjuntoInput) =>
    httpClient.post<SubidaAdjunto>(`/versiones/${versionId}/adjuntos/subida`, datos),

  agregar: (versionId: number, datos: ConfirmarAdjuntoInput) =>
    httpClient.post<Adjunto>(`/versiones/${versionId}/adjuntos`, datos),

  solicitarSubidaReemplazo: (id: number, datos: SolicitarSubidaAdjuntoInput) =>
    httpClient.post<SubidaAdjunto>(`/adjuntos/${id}/subida`, datos),

  reemplazar: (id: number, datos: ConfirmarAdjuntoInput) =>
    httpClient.put<Adjunto>(`/adjuntos/${id}`, datos),

  eliminar: (id: number) => httpClient.delete<void>(`/adjuntos/${id}`),

  /** URL SAS de solo lectura, vence en minutos — pedirla justo antes de abrir/descargar. El
   * contenedor es privado: `blobUrl` (sin SAS) no sirve para descargar. */
  obtenerUrlDescarga: (id: number, modo: ModoDescargaAdjunto) =>
    httpClient.get<UrlDescargaAdjunto>(`/adjuntos/${id}/url-descarga`, { modo }),
};
