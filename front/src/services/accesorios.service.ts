import { httpClient } from './httpClient';
import type { Accesorio, AccesorioInput } from '../types/accesorio';

export const accesoriosService = {
  listar: (tipo?: string) => httpClient.get<Accesorio[]>('/accesorios', { tipo }),

  crear: (datos: AccesorioInput) => httpClient.post<Accesorio>('/accesorios', datos),

  editar: (id: number, cambios: Partial<AccesorioInput>) => httpClient.patch<Accesorio>(`/accesorios/${id}`, cambios),

  eliminar: (id: number) => httpClient.delete<void>(`/accesorios/${id}`),
};
