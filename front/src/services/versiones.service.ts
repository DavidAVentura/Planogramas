import { httpClient } from './httpClient';
import type {
  CrearVersionInput,
  GuardarVersionResultado,
  PromoverAPilotoResultado,
  PromoverAPublicadoResultado,
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

  promoverAPiloto: (id: number, tiendaIds: number[]) =>
    httpClient.post<PromoverAPilotoResultado>(`/versiones/${id}/promover`, {
      estadoDestino: 'piloto',
      tiendaIds,
    }),

  promoverAPublicado: (id: number) =>
    httpClient.post<PromoverAPublicadoResultado>(`/versiones/${id}/promover`, {
      estadoDestino: 'publicado',
    }),

  archivar: (id: number) => httpClient.post<Version>(`/versiones/${id}/archivar`),

  obtenerTiendas: (id: number) => httpClient.get<TiendasDeVersion>(`/versiones/${id}/tiendas`),

  reemplazarTiendas: (id: number, tiendaIds: number[]) =>
    httpClient
      .put<{ versionId: number; tiendas: TiendaResumen[] }>(`/versiones/${id}/tiendas`, { tiendaIds })
      .then((r) => r.tiendas),
};
