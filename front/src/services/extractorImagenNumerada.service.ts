import { httpClient } from './httpClient';
import type { ResultadoExtraccionImagen } from '../types/extractorImagenNumerada';

export const extractorImagenNumeradaService = {
  analizar: (datos: { imagen_base64: string; mime_type: string }) =>
    httpClient.post<ResultadoExtraccionImagen>('/agente-extractor/imagen', datos),
};
