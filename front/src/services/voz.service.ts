import { httpClient } from './httpClient';
import type { VozTts } from '../config/preferenciasVoz';

interface RespuestaTranscripcion {
  texto: string;
}

interface RespuestaSesionStreaming {
  /** Secreto efímero `ek_…` para abrir el WebSocket Realtime (vive 60 s). */
  value: string;
  expira_en: number;
}

interface DatosSintetizar {
  texto: string;
  voz?: VozTts;
  velocidad?: number;
}

/** Base64 puro (sin el prefijo `data:...;base64,`), que es lo que espera el backend. */
function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => {
      const resultado = String(lector.result ?? '');
      resolve(resultado.slice(resultado.indexOf(',') + 1));
    };
    lector.onerror = () => reject(lector.error);
    lector.readAsDataURL(blob);
  });
}

export const vozService = {
  transcribir: async (audio: Blob) =>
    httpClient.post<RespuestaTranscripcion>('/voz/transcribir', { audio_base64: await blobABase64(audio) }),

  crearSesionStreaming: () => httpClient.post<RespuestaSesionStreaming>('/voz/sesion-streaming'),

  sintetizar: (datos: DatosSintetizar) => httpClient.postBinario('/voz/tts', datos),
};
