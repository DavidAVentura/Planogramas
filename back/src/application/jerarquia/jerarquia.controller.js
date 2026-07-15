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

module.exports = { listarAreas, listarDepartamentos };
