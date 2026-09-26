/**
 * vozClient.js
 * Modo voz del chat: voz→texto (transcripción REST y secreto efímero para streaming Realtime) y
 * texto→voz (TTS). Reutiliza el cliente OpenAI compartido de openaiClient.js.
 */

const { toFile } = require('openai');
const { obtenerCliente, errorServicioNoDisponible } = require('../openaiClient');

const MODELO_TRANSCRIPCION = 'gpt-4o-mini-transcribe';
const IDIOMA = 'es';
const TIMEOUT_MS = 8_000;

// "mini" a propósito: se lee texto conversacional, no hace falta el modelo más caro.
const MODELO_TTS = 'gpt-4o-mini-tts';
const VOZ_TTS_POR_DEFECTO = 'fable';
const VELOCIDAD_TTS_POR_DEFECTO = 1.7;
// Tope explícito: el front puede disparar este endpoint muchas veces.
const MAX_CARACTERES_TTS = 4_000;
const TIMEOUT_TTS_MS = 20_000;

// El server_vad de OpenAI cierra el turno tras estos ms de silencio (dispara el auto-envío).
const SILENCIO_STREAMING_MS = 3_000;
const EXPIRACION_SECRETO_S = 60;

function errorValidacion(mensaje) {
  const err = new Error(mensaje);
  err.status = 400;
  err.code = 'VALIDATION_ERROR';
  return err;
}

/**
 * Tipo real del audio según sus magic bytes (lo que produce MediaRecorder: webm en Chrome/Firefox,
 * mp4 en Safari). El tipo que declara el cliente no es confiable.
 * @param {Buffer} buffer
 * @returns {string|null}
 */
function detectarTipoReal(buffer) {
  if (!buffer || buffer.length < 4) return null;
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) return 'audio/webm';
  const cabecera = buffer.subarray(0, 4).toString('ascii');
  if (cabecera === 'OggS') return 'audio/ogg';
  if (cabecera === 'RIFF') return 'audio/wav';
  if (buffer.length >= 8 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') return 'audio/mp4';
  return null;
}

/**
 * Sin reintentos: perder un segmento no se nota (el siguiente llega solo) y un backoff frenaría
 * el dictado en vivo.
 * @param {{buffer: Buffer}} opciones
 * @returns {Promise<{texto: string}>}
 */
async function transcribir({ buffer }) {
  if (!buffer || buffer.length === 0) throw errorValidacion('El segmento de audio está vacío');
  const tipoReal = detectarTipoReal(buffer);
  if (!tipoReal) throw errorValidacion('El archivo no es un audio reconocible');

  try {
    const archivo = await toFile(buffer, `segmento.${tipoReal.split('/')[1]}`, { type: tipoReal });
    const resultado = await obtenerCliente().audio.transcriptions.create(
      { file: archivo, model: MODELO_TRANSCRIPCION, language: IDIOMA },
      { timeout: TIMEOUT_MS, maxRetries: 0 },
    );
    return { texto: (resultado.text ?? '').trim() };
  } catch (err) {
    throw errorServicioNoDisponible('No se pudo transcribir el audio', err);
  }
}

/**
 * Secreto efímero (ek_…) para que el navegador abra la sesión Realtime directo contra OpenAI sin
 * ver nunca la API key. Solo sirve para abrir la conexión; después la sesión sigue sin él.
 * @returns {Promise<{value: string, expira_en: number}>}
 */
async function crearSesionStreaming() {
  try {
    const sesion = await obtenerCliente().realtime.clientSecrets.create(
      {
        session: {
          type: 'transcription',
          audio: {
            input: {
              format: { type: 'audio/pcm', rate: 24000 },
              transcription: { model: MODELO_TRANSCRIPCION, language: IDIOMA },
              turn_detection: { type: 'server_vad', silence_duration_ms: SILENCIO_STREAMING_MS },
            },
          },
        },
        expires_after: { anchor: 'created_at', seconds: EXPIRACION_SECRETO_S },
      },
      { timeout: TIMEOUT_MS, maxRetries: 0 },
    );
    return { value: sesion.value, expira_en: sesion.expires_at };
  } catch (err) {
    throw errorServicioNoDisponible('No se pudo iniciar la sesión de streaming de voz', err);
  }
}

/**
 * Sin reintentos: si falla, el botón ▶ del mensaje permite reintentar con un clic.
 * @param {{texto: string, voz?: string, velocidad?: number}} opciones
 * @returns {Promise<Buffer>} - audio mp3
 */
async function sintetizar({ texto, voz, velocidad }) {
  if (!texto || !texto.trim()) throw errorValidacion('Falta el texto a sintetizar');

  try {
    const respuesta = await obtenerCliente().audio.speech.create(
      {
        model: MODELO_TTS,
        voice: voz ?? VOZ_TTS_POR_DEFECTO,
        input: texto.trim().slice(0, MAX_CARACTERES_TTS),
        response_format: 'mp3',
        speed: velocidad ?? VELOCIDAD_TTS_POR_DEFECTO,
      },
      { timeout: TIMEOUT_TTS_MS, maxRetries: 0 },
    );
    return Buffer.from(await respuesta.arrayBuffer());
  } catch (err) {
    throw errorServicioNoDisponible('No se pudo generar el audio', err);
  }
}

module.exports = { transcribir, crearSesionStreaming, sintetizar, detectarTipoReal };
