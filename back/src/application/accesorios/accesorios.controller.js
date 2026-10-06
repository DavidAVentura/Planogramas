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

const campos = {
  codigo:          Joi.string().trim().min(1).max(50),
  nombre:          Joi.string().trim().min(1).max(200),
  tipo:            Joi.string().valid(...TIPOS),
  longitud_cm:     Joi.number().positive().max(9999).allow(null),
  ancho_cm:        Joi.number().positive().max(9999).allow(null),
  notas_capacidad: Joi.string().trim().max(1000).allow(null, ''),
};

const schemaCrear = Joi.object({
  ...campos,
  codigo: campos.codigo.required(),
  nombre: campos.nombre.required(),
  tipo:   campos.tipo.required(),
});

const schemaEditar = Joi.object(campos).min(1);

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

async function crear(req, res, next) {
  try {
    const datos     = validarQuery(schemaCrear, req.body);
    const accesorio = await usecases.crearAccesorio(repo, datos);
    res.status(201).json(accesorio);
  } catch (err) {
    next(err);
  }
}

async function editar(req, res, next) {
  try {
    const id        = parsearId(req.params.id);
    const cambios   = validarQuery(schemaEditar, req.body);
    const accesorio = await usecases.editarAccesorio(repo, id, cambios);
    res.json(accesorio);
  } catch (err) {
    next(err);
  }
}

async function eliminar(req, res, next) {
  try {
    const id = parsearId(req.params.id);
    await usecases.eliminarAccesorio(repo, id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, editar, eliminar };
