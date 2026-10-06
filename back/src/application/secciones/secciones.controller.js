/**
 * secciones.controller.js
 * Extrae parámetros del request, llama al usecase correspondiente y formatea la respuesta.
 * No contiene lógica de negocio ni accede a la BD directamente.
 */

const Joi          = require('joi');
const { DIRECCIONES } = require('../../domain/seccion/seccion.entity');
const usecases     = require('../../domain/seccion/seccion.usecases');
const seccionRepo  = require('../../infrastructure/repositories/seccion.repository');
const gondolaRepo  = require('../../infrastructure/repositories/gondola.repository');
const versionRepo  = require('../../infrastructure/repositories/version.repository');

// ─── Esquemas de validación ───────────────────────────────────────────────────

const schemaDividir = Joi.object({
  seccion_id: Joi.number().integer().positive().optional(),
  direccion:  Joi.string().valid(...DIRECCIONES).required(),
});

const schemaRedimensionar = Joi.object({
  tam_cm: Joi.number().positive().required(),
});

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

async function obtener(req, res, next) {
  try {
    const gondolaId  = parsearId(req.params.id);
    const estructura = await usecases.obtenerEstructura(seccionRepo, gondolaRepo, gondolaId);
    res.json(estructura);
  } catch (err) {
    next(err);
  }
}

async function dividir(req, res, next) {
  try {
    const gondolaId  = parsearId(req.params.id);
    const datos      = validarBody(schemaDividir, req.body);
    const estructura = await usecases.dividir(seccionRepo, gondolaRepo, versionRepo, gondolaId, {
      seccionId: datos.seccion_id ?? null,
      direccion: datos.direccion,
    });
    res.status(201).json(estructura);
  } catch (err) {
    next(err);
  }
}

async function redimensionar(req, res, next) {
  try {
    const id         = parsearId(req.params.id);
    const datos      = validarBody(schemaRedimensionar, req.body);
    const estructura = await usecases.redimensionar(seccionRepo, gondolaRepo, versionRepo, id, datos.tam_cm);
    res.json(estructura);
  } catch (err) {
    next(err);
  }
}

async function quitar(req, res, next) {
  try {
    const id         = parsearId(req.params.id);
    const estructura = await usecases.quitar(seccionRepo, gondolaRepo, versionRepo, id);
    res.json(estructura);
  } catch (err) {
    next(err);
  }
}

module.exports = { obtener, dividir, redimensionar, quitar };
