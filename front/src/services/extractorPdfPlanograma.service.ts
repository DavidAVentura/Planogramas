import { httpClient } from './httpClient';
import type { CuerpoImportar, ResultadoExtraccionPdf, ResultadoImportacion } from '../types/extractorPdfPlanograma';

export const extractorPdfPlanogramaService = {
  analizar: (datos: { pdf_base64: string; nombre_archivo: string }) =>
    httpClient.post<ResultadoExtraccionPdf>('/agente-extractor/pdf-planograma', datos),

  importar: (versionId: number, cuerpos: CuerpoImportar[], usarPorUbicar: boolean) =>
    httpClient.post<ResultadoImportacion>(`/versiones/${versionId}/importar-layout`, { cuerpos, usar_por_ubicar: usarPorUbicar }),
};
