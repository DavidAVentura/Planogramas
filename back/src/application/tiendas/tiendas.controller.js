/**
 * tiendas.controller.js
 * Extrae parámetros del request, llama al usecase correspondiente y formatea la respuesta.
 * No contiene lógica de negocio ni accede a la BD directamente.
 */

const Joi                = require('joi');
const usecases           = require('../../domain/tienda/tienda.usecases');
const repo                = require('../../infrastructure/repositories/tienda.repository');
const { TIPOS, ESTADOS } = require('../../domain/tienda/tienda.entity');

// ─── Esquemas de validación ───────────────────────────────────────────────────

const schemaListar = Joi.object({
  tipo:               Joi.string().valid(...TIPOS).optional(),
  estado:             Joi.string().valid(...Object.values(ESTADOS)).optional(),
  sinVersionEspecial: Joi.boolean().optional(),
  planogramaId:       Joi.number().integer().positive().optional(),
  versionBaseId:      Joi.number().integer().positive().optional(),
});

const schemaPlanogramas = Joi.object({
  departamento: Joi.string().trim().optional(),
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
    const filtros = validarQuery(schemaListar, req.query);
    const tiendas = await usecases.listarTiendas(repo, filtros);
    res.json(tiendas);
  } catch (err) {
    next(err);
  }
}

async function obtenerPlanogramas(req, res, next) {
  try {
    const tiendaId  = parsearId(req.params.tiendaId);
    const filtros   = validarQuery(schemaPlanogramas, req.query);
    const resultado = await usecases.obtenerPlanogramasDeTienda(repo, tiendaId, filtros);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtenerPlanogramas };
