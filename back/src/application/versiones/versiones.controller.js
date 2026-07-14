/**
 * versiones.controller.js
 * Extrae parámetros del request, llama al usecase correspondiente y formatea la respuesta.
 * No contiene lógica de negocio ni accede a la BD directamente.
 */

const Joi             = require('joi');
const usecases        = require('../../domain/version/version.usecases');
const { TIPOS, ESTADOS } = require('../../domain/version/version.entity');
const versionRepo     = require('../../infrastructure/repositories/version.repository');
const planogramaRepo  = require('../../infrastructure/repositories/planograma.repository');

// ─── Esquemas de validación ───────────────────────────────────────────────────

const schemaListarQuery = Joi.object({
  incluirArchivadas: Joi.boolean().default(false),
});

const schemaCrear = Joi.object({
  tipo:          Joi.string().valid(...Object.values(TIPOS)).required(),
  notas:         Joi.string().trim().max(500).allow(null, '').optional(),
  versionBaseId: Joi.number().integer().positive().optional(),
  tiendaId:      Joi.number().integer().positive()
    .when('versionBaseId', { is: Joi.exist(), then: Joi.required(), otherwise: Joi.optional() }),
});

const schemaVistaQuery = Joi.object({
  vistaImplementador: Joi.boolean().default(false),
});

const schemaEditar = Joi.object({
  notas:  Joi.string().trim().max(500).allow(null, '').optional(),
  codigo: Joi.string().trim().max(50).optional(),
}).min(1);

const schemaPromover = Joi.object({
  estadoDestino: Joi.string().valid(ESTADOS.PILOTO, ESTADOS.PUBLICADO).required(),
  tiendaIds:     Joi.array().items(Joi.number().integer().positive()).min(1)
    .when('estadoDestino', { is: ESTADOS.PILOTO, then: Joi.required(), otherwise: Joi.optional() }),
});

const schemaTiendas = Joi.object({
  tiendaIds: Joi.array().items(Joi.number().integer().positive()).required(),
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
  if (error) {
    throw error;
  }
  return value;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function listar(req, res, next) {
  try {
    const planogramaId = parsearId(req.params.id);
    const filtros       = validarBody(schemaListarQuery, req.query);
    const resultado      = await usecases.listarVersiones(versionRepo, planogramaRepo, planogramaId, filtros);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function crear(req, res, next) {
  try {
    const planogramaId = parsearId(req.params.id);
    const datos         = validarBody(schemaCrear, req.body);
    const version        = await usecases.crearVersion(versionRepo, planogramaRepo, planogramaId, datos);
    res.status(201).json(version);
  } catch (err) {
    next(err);
  }
}

async function obtener(req, res, next) {
  try {
    const id       = parsearId(req.params.id);
    const opciones = validarBody(schemaVistaQuery, req.query);
    const version    = await usecases.obtenerDetalle(versionRepo, id, opciones);
    res.json(version);
  } catch (err) {
    next(err);
  }
}

async function editar(req, res, next) {
  try {
    const id      = parsearId(req.params.id);
    const cambios = validarBody(schemaEditar, req.body);
    const version   = await usecases.editarMetadatos(versionRepo, id, cambios);
    res.json(version);
  } catch (err) {
    next(err);
  }
}

async function guardar(req, res, next) {
  try {
    const id      = parsearId(req.params.id);
    const version = await usecases.guardarVersion(versionRepo, id);
    res.json(version);
  } catch (err) {
    next(err);
  }
}

async function promover(req, res, next) {
  try {
    const id         = parsearId(req.params.id);
    const datos      = validarBody(schemaPromover, req.body);
    const resultado  = await usecases.promoverVersion(versionRepo, id, datos);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function obtenerTiendas(req, res, next) {
  try {
    const id        = parsearId(req.params.id);
    const resultado = await usecases.listarTiendasVersion(versionRepo, id);
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

async function reemplazarTiendas(req, res, next) {
  try {
    const id        = parsearId(req.params.id);
    const datos     = validarBody(schemaTiendas, req.body);
    const resultado = await usecases.reemplazarTiendasVersion(versionRepo, id, datos.tiendaIds);
    res.json({ versionId: id, tiendas: resultado.tiendas });
  } catch (err) {
    next(err);
  }
}

async function obtenerEstructura(req, res, next) {
  try {
    const id         = parsearId(req.params.id);
    const opciones   = validarBody(schemaVistaQuery, req.query);
    const estructura = await usecases.obtenerEstructuraPublicada(versionRepo, id, opciones);
    res.json(estructura);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  crear,
  obtener,
  editar,
  guardar,
  promover,
  obtenerTiendas,
  reemplazarTiendas,
  obtenerEstructura,
};
