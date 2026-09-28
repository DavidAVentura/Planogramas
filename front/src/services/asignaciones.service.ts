import { httpClient } from './httpClient';
import type {
  CambioAsignacion,
  EventoHistorial,
  MatrizAsignaciones,
  ResultadoEdicion,
  ResumenVersion,
} from '../types/asignacion';

export const asignacionesService = {
  obtenerMatriz: () => httpClient.get<MatrizAsignaciones>('/asignaciones'),

  guardarEdicion: (cambios: CambioAsignacion[], motivo: string) =>
    httpClient.post<ResultadoEdicion>('/asignaciones/ediciones', { cambios, motivo: motivo.trim() || null }),

  historial: (planogramaId: number, tiendaId: number) =>
    httpClient
      .get<{ eventos: EventoHistorial[] }>('/asignaciones/historial', { planogramaId, tiendaId })
      .then((r) => r.eventos),

  resumenVersion: (versionId: number) => httpClient.get<ResumenVersion>(`/versiones/${versionId}/resumen`),
};
