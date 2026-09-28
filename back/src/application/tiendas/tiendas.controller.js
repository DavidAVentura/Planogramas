/**
 * tiendas.controller.js
 * Extrae parámetros del request, llama al usecase correspondiente y formatea la respuesta.
 * No contiene lógica de negocio ni accede a la BD directamente.
 */

const Joi                = require('joi');
const usecases           = require('../../domain/tienda/tienda.usecases');
const repo                = require('../../infrastructure/repositories/tienda.repository');
const { TIPOS, ESTADOS, FILTRO_ESTADO_TODOS, MARCAS } = require('../../domain/tienda/tienda.entity');

// ─── Esquemas de validación ───────────────────────────────────────────────────

const schemaListar = Joi.object({
  tipo:               Joi.string().valid(...TIPOS).optional(),
  estado:             Joi.string().valid(...Object.values(ESTADOS), FILTRO_ESTADO_TODOS).optional(),
  sinVersionEspecial: Joi.boolean().optional(),
  planogramaId:       Joi.number().integer().positive().optional(),
  versionBaseId:      Joi.number().integer().positive().optional(),
});

// El código se normaliza a mayúsculas (T0PC, TJQM...) antes de validar unicidad.
const campoCodigo = Joi.string().trim().uppercase().max(20).pattern(/^[A-Z0-9-]+$/);
const campoNombre = Joi.string().trim().min(1).max(200);
const campoTipo   = Joi.string().valid(...TIPOS);
const campoMarca  = Joi.string().valid(...MARCAS).allow(null);
const campoRegion = Joi.string().trim().max(200).allow(null);

const schemaCrear = Joi.object({
  codigo: campoCodigo.required(),
  nombre: campoNombre.required(),
  tipo:   campoTipo.required(),
  marca:  campoMarca.optional(),
  region: campoRegion.optional(),
});

const schemaEditar = Joi.object({
  codigo: campoCodigo.optional(),
  nombre: campoNombre.optional(),
  tipo:   campoTipo.optional(),
  marca:  campoMarca.optional(),
  region: campoRegion.optional(),
  estado: Joi.string().valid(...Object.values(ESTADOS)).optional(),
}).min(1);  // al menos un campo requerido

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

function validar(schema, datos) {
  const { error, value } = schema.validate(datos, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw error;
  }
  return value;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function listar(req, res, next) {
  try {
    const filtros = validar(schemaListar, req.query);
    const tiendas = await usecases.listarTiendas(repo, filtros);
    res.json(tiendas);
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const datos  = validar(schemaCrear, req.body);
    const tienda = await usecases.crearTienda(repo, datos);
    res.status(201).json(tienda);
  } catch (err) {
    next(err);
  }
}

async function editar(req, res, next) {
  try {
    const id      = parsearId(req.params.id);
    const cambios = validar(schemaEditar, req.body);
    const tienda  = await usecases.editarTienda(repo, id, cambios);
    res.json(tienda);
  } catch (err) {
    next(err);
  }
}

async function obtenerPlanogramas(req, res, next) {
  try {
    const tiendaId  = parsearId(req.params.tiendaId);
    const filtros   = validar(schemaPlanogramas, req.query);
    const resultado = await usecases.obtenerPlanogramasDeTienda(repo, tiendaId, filtros);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, crear, editar, obtenerPlanogramas };
