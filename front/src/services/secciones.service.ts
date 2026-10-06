import { httpClient } from './httpClient';
import type { DividirSeccionInput, EstructuraSecciones } from '../types/seccion';
import type { SkuMinMaxCambios, SkusDeVersion, SkuVersion } from '../types/skuVersion';

export const seccionesService = {
  obtener: (gondolaId: number) => httpClient.get<EstructuraSecciones>(`/gondolas/${gondolaId}/secciones`),

  dividir: (gondolaId: number, datos: DividirSeccionInput) =>
    httpClient.post<EstructuraSecciones>(`/gondolas/${gondolaId}/secciones/dividir`, datos),

  redimensionar: (seccionId: number, tamCm: number) =>
    httpClient.patch<EstructuraSecciones>(`/secciones/${seccionId}`, { tam_cm: tamCm }),

  quitar: (seccionId: number) => httpClient.delete<EstructuraSecciones>(`/secciones/${seccionId}`),
};

export const skusVersionService = {
  listar: (versionId: number) => httpClient.get<SkusDeVersion>(`/versiones/${versionId}/skus`),

  editar: (versionId: number, sku: string, cambios: SkuMinMaxCambios) =>
    httpClient.patch<SkuVersion>(`/versiones/${versionId}/skus/${encodeURIComponent(sku)}`, cambios),
};
