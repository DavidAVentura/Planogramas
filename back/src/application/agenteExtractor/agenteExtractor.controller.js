/**
 * agenteExtractor.controller.js
 * Recibe el mensaje del chat, delega la conversación al Agente Extractor (back/src/agents/)
 * y devuelve la respuesta + el borrador acumulado. Sin persistencia — el historial y el borrador
 * viajan completos en cada request; el frontend los mantiene en memoria durante la conversación.
 */

const Joi = require('joi');
const { agenteExtractor } = require('../../agents');
const openaiClient = require('../../agents/openaiClient');
const catiClient = require('../../infrastructure/cati/catiClient');

// ─── Esquemas de validación ───────────────────────────────────────────────────

const schemaMensaje = Joi.object({
  mensaje: Joi.string().trim().min(1).required(),
  historial: Joi.array()
    .items(Joi.object({
      rol: Joi.string().valid('user', 'assistant').required(),
      contenido: Joi.string().allow('').required(),
    }))
    .default([]),
  borrador_actual: Joi.array().items(Joi.object().unknown(true)).default([]),
  contexto: Joi.object({
    subcategorias: Joi.array().items(Joi.string()).default([]),
    gondolas: Joi.array()
      .items(Joi.object({
        gondola_orden: Joi.number().integer().positive().required(),
        nombre:        Joi.string().allow('').required(),
        total_niveles: Joi.number().integer().min(0).required(),
      }))
      .default([]),
    niveles: Joi.array()
      .items(Joi.object({
        gondola_orden:  Joi.number().integer().positive().required(),
        nivel_orden:    Joi.number().integer().positive().required(),
        tipo_accesorio: Joi.string().required(),
      }))
      .default([]),
    posiciones: Joi.array()
      .items(Joi.object({
        gondola_orden: Joi.number().integer().positive().required(),
        nivel_orden:   Joi.number().integer().positive().required(),
        espacio_orden: Joi.number().integer().positive().required(),
        sku:           Joi.string().required(),
        nombre:        Joi.string().allow(null, '').optional(),
      }))
      .default([]),
    accesorios: Joi.array()
      .items(Joi.object({
        codigo: Joi.string().required(),
        nombre: Joi.string().allow('').required(),
        tipo:   Joi.string().required(),
      }))
      .default([]),
  }).default({}),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validarBody(schema, body) {
  const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) throw error;
  return value;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function procesarMensaje(req, res, next) {
  try {
    const datos = validarBody(schemaMensaje, req.body);
    const resultado = await agenteExtractor.procesarMensaje(
      {
        mensaje:        datos.mensaje,
        historial:      datos.historial,
        borradorActual: datos.borrador_actual,
        contexto:       datos.contexto,
      },
      { openaiClient, catiClient },
    );

    res.json({
      mensaje_asistente:    resultado.mensajeAsistente,
      borrador:             resultado.borrador,
      listo_para_confirmar: resultado.listoParaConfirmar,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { procesarMensaje };
