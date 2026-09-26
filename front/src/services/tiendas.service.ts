import { httpClient } from './httpClient';
import type {
  CrearTiendaInput,
  EditarTiendaInput,
  EstadoTienda,
  PlanogramasDeTienda,
  Tienda,
} from '../types/tienda';

export interface FiltrosTiendas {
  tipo?: string;
  /** Omitido = solo activas; `todos` = activas e inactivas (vista de administración). */
  estado?: EstadoTienda | 'todos';
  sinVersionEspecial?: boolean;
  planogramaId?: number;
  versionBaseId?: number;
}

export const tiendasService = {
  listar: (filtros: FiltrosTiendas = {}) => httpClient.get<Tienda[]>('/tiendas', { ...filtros }),

  crear: (datos: CrearTiendaInput) => httpClient.post<Tienda>('/tiendas', datos),

  editar: (id: number, cambios: EditarTiendaInput) => httpClient.patch<Tienda>(`/tiendas/${id}`, cambios),

  planogramasPublicados: (id: number) => httpClient.get<PlanogramasDeTienda>(`/tiendas/${id}/planogramas`),
};
