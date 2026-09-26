/**
 * asignaciones.controller.js
 * Extrae parámetros del request, llama al usecase correspondiente y formatea la respuesta.
 * No contiene lógica de negocio ni accede a la BD directamente.
 */

const Joi             = require('joi');
const usecases        = require('../../domain/asignacion/asignacion.usecases');
const { USUARIO_SISTEMA } = require('../../domain/asignacion/asignacion.entity');
const asignacionRepo  = require('../../infrastructure/repositories/asignacion.repository');

// ─── Esquemas de validación ───────────────────────────────────────────────────

// Cada cambio lleva a lo sumo uno de `versionId` / `crearEspecialDesde`; sin ninguno = quitar.
const schemaCambio = Joi.object({
  planogramaId:       Joi.number().integer().positive().required(),
  tiendaId:           Joi.number().integer().positive().required(),
  versionId:          Joi.number().integer().positive().allow(null).optional(),
  crearEspecialDesde: Joi.number().integer().positive().optional(),
}).oxor('versionId', 'crearEspecialDesde');

const schemaEdicion = Joi.object({
  cambios: Joi.array().items(schemaCambio).min(1).max(2000).required(),
  motivo:  Joi.string().trim().max(500).allow(null, '').optional(),
});

const schemaHistorialQuery = Joi.object({
  planogramaId: Joi.number().integer().positive().required(),
  tiendaId:     Joi.number().integer().positive().required(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validar(schema, datos) {
  const { error, value } = schema.validate(datos, { abortEarly: false, stripUnknown: true });
  if (error) throw error;
  return value;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function obtenerMatriz(req, res, next) {
  try {
    const matriz = await usecases.obtenerMatriz(asignacionRepo);
    res.json(matriz);
  } catch (err) {
    next(err);
  }
}

async function guardarEdicion(req, res, next) {
  try {
    const datos = validar(schemaEdicion, req.body);
    // TODO: reemplazar USUARIO_SISTEMA por el usuario autenticado cuando exista el middleware de CAO.
    const resultado = await usecases.guardarEdicion(asignacionRepo, datos, USUARIO_SISTEMA);
    res.status(201).json(resultado);
  } catch (err) {
    next(err);
  }
}

async function listarHistorial(req, res, next) {
  try {
    const filtros   = validar(schemaHistorialQuery, req.query);
    const resultado = await usecases.listarHistorial(asignacionRepo, filtros);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  obtenerMatriz,
  guardarEdicion,
  listarHistorial,
};
