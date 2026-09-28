import { httpClient } from './httpClient';
import type { AgregarEvidenciaInput, EvidenciaCreada, EvidenciasDeVersion } from '../types/evidencia';

export const evidenciasService = {
  listar: (tiendaId: number, versionId: number) =>
    httpClient.get<EvidenciasDeVersion>(`/tiendas/${tiendaId}/versiones/${versionId}/evidencias`),

  agregar: (tiendaId: number, versionId: number, datos: AgregarEvidenciaInput) =>
    httpClient.post<EvidenciaCreada>(`/tiendas/${tiendaId}/versiones/${versionId}/evidencias`, datos),

  /** El contenedor es privado: la foto se pide con el Bearer y se muestra con un object URL. */
  descargar: (id: number) => httpClient.getBinario(`/evidencias/${id}/descargar`),

  eliminar: (id: number) => httpClient.delete<void>(`/evidencias/${id}`),
};
