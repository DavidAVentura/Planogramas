/**
 * skusVersion.controller.js
 * Extrae parámetros del request, llama al usecase correspondiente y formatea la respuesta.
 * No contiene lógica de negocio ni accede a la BD directamente.
 */

const Joi         = require('joi');
const usecases    = require('../../domain/skuVersion/skuVersion.usecases');
const skuRepo     = require('../../infrastructure/repositories/skuVersion.repository');
const versionRepo = require('../../infrastructure/repositories/version.repository');

// ─── Esquemas de validación ───────────────────────────────────────────────────

const schemaEditar = Joi.object({
  min_final: Joi.number().integer().min(0).allow(null).optional(),
  max_final: Joi.number().integer().min(0).allow(null).optional(),
}).min(1);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsearId(valor) {
  const id = parseInt(valor, 10);
  if (isNaN(id) || id < 1) {
    const err = new Error('El id debe ser un entero positivo');
    err.status = 400;
    err.code   = 'VALIDATION_ERROR';
    throw err;
  }
  return id;
}

function validarBody(schema, body) {
  const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) throw error;
  return value;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function listar(req, res, next) {
  try {
    const versionId = parsearId(req.params.id);
    res.json(await usecases.obtenerSkus(skuRepo, versionRepo, versionId));
  } catch (err) {
    next(err);
  }
}

async function editar(req, res, next) {
  try {
    const versionId = parsearId(req.params.id);
    const cambios   = validarBody(schemaEditar, req.body);
    res.json(await usecases.editarSku(skuRepo, versionRepo, versionId, String(req.params.sku), cambios));
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, editar };
