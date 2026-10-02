import { httpClient } from './httpClient';
import type {
  CrearVersionInput,
  GuardarVersionResultado,
  PromoverAPilotoResultado,
  PromoverAPublicadoResultado,
  SimulacionPublicacion,
  TiendaResumen,
  TiendasDeVersion,
  Version,
  VersionListItem,
} from '../types/version';

export const versionesService = {
  listarPorPlanograma: (planogramaId: number, incluirArchivadas = false) =>
    httpClient
      .get<{ versiones: VersionListItem[] }>(`/planogramas/${planogramaId}/versiones`, { incluirArchivadas })
      .then((r) => r.versiones),

  crear: (planogramaId: number, datos: CrearVersionInput) =>
    httpClient.post<Version>(`/planogramas/${planogramaId}/versiones`, datos),

  guardar: (id: number) => httpClient.patch<GuardarVersionResultado>(`/versiones/${id}/guardar`),

  promoverAPiloto: (id: number, tiendaIds: number[], motivo = '') =>
    httpClient.post<PromoverAPilotoResultado>(`/versiones/${id}/promover`, {
      estadoDestino: 'piloto',
      tiendaIds,
      motivo: motivo.trim() || null,
    }),

  promoverAPublicado: (id: number, motivo = '') =>
    httpClient.post<PromoverAPublicadoResultado>(`/versiones/${id}/promover`, {
      estadoDestino: 'publicado',
      motivo: motivo.trim() || null,
    }),

  simularPublicacion: (id: number) => httpClient.get<SimulacionPublicacion>(`/versiones/${id}/publicacion/simular`),

  archivar: (id: number) => httpClient.post<Version>(`/versiones/${id}/archivar`),

  obtenerTiendas: (id: number) => httpClient.get<TiendasDeVersion>(`/versiones/${id}/tiendas`),

  reemplazarTiendas: (id: number, tiendaIds: number[]) =>
    httpClient
      .put<{ versionId: number; tiendas: TiendaResumen[] }>(`/versiones/${id}/tiendas`, { tiendaIds })
      .then((r) => r.tiendas),
};
