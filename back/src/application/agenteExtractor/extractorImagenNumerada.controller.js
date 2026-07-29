/**
 * extractorImagenNumerada.controller.js
 * Recibe una foto de un mueble numerado, la delega al Agente Extractor de Imagen Numerada
 * (back/src/agents/) y devuelve la estructura de niveles/productos/facings interpretada. Sin
 * persistencia — no toca el planograma; el frontend usa el resultado para armar un mensaje de
 * chat hacia el Agente Extractor de texto.
 */

const Joi = require('joi');
const { extractorImagenNumerada } = require('../../agents');
const openaiClient = require('../../agents/openaiClient');

const MIME_TYPES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

const schemaImagen = Joi.object({
  imagen_base64: Joi.string().trim().min(1).required(),
  mime_type: Joi.string().valid(...MIME_TYPES_PERMITIDOS).required(),
});

function validarBody(schema, body) {
  const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) throw error;
  return value;
}

async function procesarImagen(req, res, next) {
  try {
    const datos = validarBody(schemaImagen, req.body);
    const resultado = await extractorImagenNumerada.procesarImagen(
      { imagenBase64: datos.imagen_base64, mimeType: datos.mime_type },
      { openaiClient },
    );

    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { procesarImagen };
