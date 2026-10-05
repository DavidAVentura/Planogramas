/**
 * voz.controller.js
 * Modo voz del chat del Agente Extractor: transcripción de segmentos de audio, secreto efímero
 * para el dictado en streaming y lectura en voz alta (TTS). Sin persistencia.
 */

const Joi = require('joi');
const { voz } = require('../../agents');

// Whitelist explícita — debe coincidir con VozTts de front/src/config/preferenciasVoz.ts.
const VOCES_PERMITIDAS = ['fable', 'alloy', 'echo'];

// ─── Esquemas de validación ───────────────────────────────────────────────────

const schemaTranscribir = Joi.object({
  audio_base64: Joi.string().base64().min(1).required(),
});

const schemaTts = Joi.object({
  texto:     Joi.string().trim().min(1).required(),
  voz:       Joi.string().valid(...VOCES_PERMITIDAS).optional(),
  // Mismo rango que el slider del front.
  velocidad: Joi.number().min(1).max(2).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validarBody(schema, body) {
  const { error, value } = schema.validate(body ?? {}, { abortEarly: false, stripUnknown: true });
  if (error) throw error;
  return value;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function transcribir(req, res, next) {
  try {
    const datos = validarBody(schemaTranscribir, req.body);
    // El tope de tamaño lo pone express.json({ limit: '15mb' }) en app.js.
    const buffer = Buffer.from(datos.audio_base64, 'base64');
    const resultado = await voz.transcribir({ buffer });
    res.json({ texto: resultado.texto });
  } catch (err) {
    next(err);
  }
}

async function crearSesionStreaming(req, res, next) {
  try {
    const sesion = await voz.crearSesionStreaming();
    res.json({ value: sesion.value, expira_en: sesion.expira_en });
  } catch (err) {
    next(err);
  }
}

async function sintetizar(req, res, next) {
  try {
    const datos = validarBody(schemaTts, req.body);
    const buffer = await voz.sintetizar(datos);
    // Respuesta binaria (no JSON): el front la pide con httpClient.postBinario.
    res.set('Content-Type', 'audio/mpeg');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

module.exports = { transcribir, crearSesionStreaming, sintetizar };
