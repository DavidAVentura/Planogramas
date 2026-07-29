import { httpClient } from './httpClient';
import type {
  CrearPlanogramaInput,
  EditarPlanogramaInput,
  ListarPlanogramasFiltros,
  ListarPlanogramasResultado,
  PlanogramaDetalle,
} from '../types/planograma';

export const planogramasService = {
  listar: (filtros: ListarPlanogramasFiltros) =>
    httpClient.get<ListarPlanogramasResultado>('/planogramas', {
      departamento: filtros.departamento,
      estado: filtros.estado,
      search: filtros.search,
      page: filtros.page,
      pageSize: filtros.pageSize,
    }),

  obtener: (id: number) => httpClient.get<PlanogramaDetalle>(`/planogramas/${id}`),

  crear: (datos: CrearPlanogramaInput) =>
    httpClient.post<PlanogramaDetalle>('/planogramas', datos),

  editar: (id: number, cambios: EditarPlanogramaInput) =>
    httpClient.patch<PlanogramaDetalle>(`/planogramas/${id}`, cambios),

  archivar: (id: number) =>
    httpClient.post<PlanogramaDetalle>(`/planogramas/${id}/archivar`),
};
