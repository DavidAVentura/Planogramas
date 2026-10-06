import { httpClient } from './httpClient';
import type { ProductoExcel, ResultadoImportacionProductos } from '../types/importacionProductos';

export const importacionProductosService = {
  importar: (versionId: number, productos: ProductoExcel[]) =>
    httpClient.post<ResultadoImportacionProductos>(`/versiones/${versionId}/importar-productos`, { productos }),
};
