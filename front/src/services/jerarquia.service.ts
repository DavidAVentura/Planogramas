import { httpClient } from './httpClient';
import type { JerarquiaItem } from '../types/jerarquia';

export const jerarquiaService = {
  listarAreas: () => httpClient.get<JerarquiaItem[]>('/jerarquia/areas'),

  listarDepartamentos: (area: string) =>
    httpClient.get<JerarquiaItem[]>('/jerarquia/departamentos', { area }),

  listarFamilias: (departamento: string) =>
    httpClient.get<JerarquiaItem[]>('/jerarquia/familias', { departamento }),

  listarCategorias: (familia: string) =>
    httpClient.get<JerarquiaItem[]>('/jerarquia/categorias', { familia }),

  listarSubcategorias: (categoria: string) =>
    httpClient.get<JerarquiaItem[]>('/jerarquia/subcategorias', { categoria }),
};
