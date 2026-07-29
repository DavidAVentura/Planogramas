import { httpClient } from './httpClient';
import type {
  Nivel,
  NivelCambios,
  NivelEditado,
  NivelInput,
  NivelResumen,
  OrdenNivel,
} from '../types/nivel';

export const nivelesService = {
  listarPorGondola: (gondolaId: number) => httpClient.get<Nivel[]>(`/gondolas/${gondolaId}/niveles`),

  agregar: (gondolaId: number, datos: NivelInput) =>
    httpClient.post<Nivel>(`/gondolas/${gondolaId}/niveles`, datos),

  editar: (id: number, cambios: NivelCambios) => httpClient.patch<NivelEditado>(`/niveles/${id}`, cambios),

  reordenar: (gondolaId: number, orden: OrdenNivel[]) =>
    httpClient
      .patch<{ niveles: OrdenNivel[] }>(`/gondolas/${gondolaId}/niveles/orden`, { orden })
      .then((r) => r.niveles),

  obtenerResumen: (id: number) => httpClient.get<NivelResumen>(`/niveles/${id}/resumen`),

  eliminar: (id: number, forzar = false) => httpClient.delete<void>(`/niveles/${id}`, { forzar }),
};
