import { httpClient } from './httpClient';
import type { JerarquiaItem } from '../types/jerarquia';

export const jerarquiaService = {
  listarAreas: () => httpClient.get<JerarquiaItem[]>('/jerarquia/areas'),

  listarDepartamentos: (area: string) =>
    httpClient.get<JerarquiaItem[]>('/jerarquia/departamentos', { area }),
};
