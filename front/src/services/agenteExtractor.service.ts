import { httpClient } from './httpClient';
import type { MensajeAgenteExtractorInput, RespuestaAgenteExtractor } from '../types/agenteExtractor';

export const agenteExtractorService = {
  enviarMensaje: (datos: MensajeAgenteExtractorInput) =>
    httpClient.post<RespuestaAgenteExtractor>('/agente-extractor/mensaje', datos),
};
