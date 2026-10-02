import { httpClient } from './httpClient';
import type {
  CambioAsignacion,
  EventoHistorial,
  MatrizAsignaciones,
  ResultadoEdicion,
  ResumenVersion,
} from '../types/asignacion';

export const asignacionesService = {
  /** `incluirPlanogramaId` trae ese planograma aunque aún no tenga versiones publicadas ni en piloto. */
  obtenerMatriz: (incluirPlanogramaId?: number) =>
    httpClient.get<MatrizAsignaciones>('/asignaciones', incluirPlanogramaId ? { incluirPlanogramaId } : undefined),

  guardarEdicion: (cambios: CambioAsignacion[], motivo: string) =>
    httpClient.post<ResultadoEdicion>('/asignaciones/ediciones', { cambios, motivo: motivo.trim() || null }),

  historial: (planogramaId: number, tiendaId: number) =>
    httpClient
      .get<{ eventos: EventoHistorial[] }>('/asignaciones/historial', { planogramaId, tiendaId })
      .then((r) => r.eventos),

  resumenVersion: (versionId: number) => httpClient.get<ResumenVersion>(`/versiones/${versionId}/resumen`),
};
