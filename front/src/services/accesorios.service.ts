import { httpClient } from './httpClient';
import type { Accesorio } from '../types/accesorio';

export const accesoriosService = {
  listar: (tipo?: string) => httpClient.get<Accesorio[]>('/accesorios', { tipo }),
};
