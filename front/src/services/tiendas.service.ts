import { httpClient } from './httpClient';
import type { Tienda } from '../types/tienda';

export interface FiltrosTiendas {
  tipo?: string;
  sinVersionEspecial?: boolean;
  planogramaId?: number;
  versionBaseId?: number;
}

export const tiendasService = {
  listar: (filtros: FiltrosTiendas = {}) => httpClient.get<Tienda[]>('/tiendas', { ...filtros }),
};
