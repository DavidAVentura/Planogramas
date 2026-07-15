/**
 * accesorios.controller.js
 * Extrae parámetros del request, llama al usecase correspondiente y formatea la respuesta.
 * No contiene lógica de negocio ni accede a la BD directamente.
 */

const Joi      = require('joi');
const usecases = require('../../domain/accesorio/accesorio.usecases');
const repo     = require('../../infrastructure/repositories/accesorio.repository');
const { TIPOS } = require('../../domain/accesorio/accesorio.entity');

// ─── Esquemas de validación ───────────────────────────────────────────────────

const schemaListar = Joi.object({
  tipo: Joi.string().valid(...TIPOS).optional(),
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

function validarQuery(schema, query) {
  const { error, value } = schema.validate(query, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw error;
  }
  return value;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function listar(req, res, next) {
  try {
    const filtros    = validarQuery(schemaListar, req.query);
    const accesorios = await usecases.listarAccesorios(repo, filtros);
    res.json(accesorios);
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const id        = parsearId(req.params.id);
    const accesorio = await usecases.obtenerAccesorio(repo, id);
    res.json(accesorio);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener };
