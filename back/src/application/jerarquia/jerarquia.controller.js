/**
 * jerarquia.controller.js
 * Proxy a CATI: extrae parámetros del request, llama al cliente CATI y formatea la respuesta.
 * Sin capa de dominio — el módulo no tiene reglas de negocio propias, solo cachea y traduce
 * el catálogo externo (ver Arquitectura/ESTRUCTURA_BACKEND.md).
 */

const Joi        = require('joi');
const catiClient = require('../../infrastructure/cati/catiClient');

// ─── Esquemas de validación ───────────────────────────────────────────────────

const schemaDepartamentos = Joi.object({
  area: Joi.string().trim().required(),
});

const schemaFamilias = Joi.object({
  departamento: Joi.string().trim().required(),
});

const schemaCategorias = Joi.object({
  familia: Joi.string().trim().required(),
});

const schemaSubcategorias = Joi.object({
  categoria: Joi.string().trim().required(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validarQuery(schema, query) {
  const { error, value } = schema.validate(query, { abortEarly: false, stripUnknown: true });
  if (error) throw error;
  return value;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function listarAreas(req, res, next) {
  try {
    const areas = await catiClient.obtenerAreas();
    res.json(areas);
  } catch (err) {
    next(err);
  }
}

async function listarDepartamentos(req, res, next) {
  try {
    const { area }    = validarQuery(schemaDepartamentos, req.query);
    const departamentos = await catiClient.obtenerDepartamentos(area);
    res.json(departamentos);
  } catch (err) {
    next(err);
  }
}

async function listarFamilias(req, res, next) {
  try {
    const { departamento } = validarQuery(schemaFamilias, req.query);
    const familias = await catiClient.obtenerFamilias(departamento);
    res.json(familias);
  } catch (err) {
    next(err);
  }
}

async function listarCategorias(req, res, next) {
  try {
    const { familia } = validarQuery(schemaCategorias, req.query);
    const categorias = await catiClient.obtenerCategorias(familia);
    res.json(categorias);
  } catch (err) {
    next(err);
  }
}

async function listarSubcategorias(req, res, next) {
  try {
    const { categoria } = validarQuery(schemaSubcategorias, req.query);
    const subcategorias = await catiClient.obtenerSubcategorias(categoria);
    res.json(subcategorias);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listarAreas,
  listarDepartamentos,
  listarFamilias,
  listarCategorias,
  listarSubcategorias,
};
