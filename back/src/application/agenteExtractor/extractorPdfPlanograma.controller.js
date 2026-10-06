/**
 * extractorPdfPlanograma.controller.js
 * Recibe el PDF de un planograma, lo delega al Agente Importador de PDF (back/src/agents/) y
 * devuelve la propuesta de layout (cuerpos → secciones → niveles → espacios) con los productos
 * identificados contra CATI. Sin persistencia — la importación la hace
 * POST /versiones/:id/importar-layout una vez que el usuario revisó la propuesta.
 */

const Joi = require('joi');
const env = require('../../config/env');
const { extractorPdfPlanograma } = require('../../agents');
const openaiClient = require('../../agents/openaiClient');
const catiClient = require('../../infrastructure/cati/catiClient');
const accesorioRepo = require('../../infrastructure/repositories/accesorio.repository');

/** Tope del PDF ya decodificado (el body en base64 pesa ~4/3 de esto; ver app.js). */
const MAX_BYTES_PDF = 15 * 1024 * 1024;

const schemaPdf = Joi.object({
  pdf_base64: Joi.string().trim().min(1).required(),
  nombre_archivo: Joi.string().trim().min(1).max(255).pattern(/\.pdf$/i).required(),
});

function validarBody(schema, body) {
  const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) throw error;
  return value;
}

function errorValidacion(mensaje) {
  const err = new Error(mensaje);
  err.status = 400;
  err.code = 'VALIDATION_ERROR';
  return err;
}

/** Comprueba tamaño y firma (%PDF-) sin decodificar todo el archivo. */
function validarPdf(base64) {
  const bytes = Math.floor((base64.length * 3) / 4);
  if (bytes > MAX_BYTES_PDF) throw errorValidacion('El PDF supera el máximo de 15 MB');
  const cabecera = Buffer.from(base64.slice(0, 8), 'base64').toString('latin1');
  if (!cabecera.startsWith('%PDF-')) throw errorValidacion('El archivo no es un PDF válido');
}

async function procesarPdf(req, res, next) {
  try {
    const datos = validarBody(schemaPdf, req.body);
    validarPdf(datos.pdf_base64);

    const accesorios = await accesorioRepo.listar({});
    const resultado = await extractorPdfPlanograma.procesarPdf(
      { pdfBase64: datos.pdf_base64, nombreArchivo: datos.nombre_archivo },
      { openaiClient, catiClient, accesorios, modelo: env.openai.modelPdf, razonamiento: env.openai.razonamientoPdf },
    );

    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { procesarPdf };
