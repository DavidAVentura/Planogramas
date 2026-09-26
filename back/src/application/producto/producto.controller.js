/**
 * producto.controller.js
 * Extrae parámetros del request, llama al usecase correspondiente y formatea la respuesta.
 * Escritura sobre la tabla local `Producto` (dimensiones físicas) — distinto del módulo
 * `catalogo`, que es un proxy de solo lectura a CATI sin capa de dominio propia.
 */

const Joi        = require('joi');
const usecases    = require('../../domain/producto/producto.usecases');
const productoRepo = require('../../infrastructure/repositories/producto.repository');
const catiClient   = require('../../infrastructure/cati/catiClient');

// ─── Esquemas de validación ───────────────────────────────────────────────────

// Ids de CATI (los mismos que devuelve GET /jerarquia/*); se usa solo el nivel más específico.
const campoJerarquia = Joi.string().trim().min(1).optional();

const schemaListar = Joi.object({
  area:         campoJerarquia,
  departamento: campoJerarquia,
  familia:      campoJerarquia,
  categoria:    campoJerarquia,
  subcategoria: campoJerarquia,
});

const schemaActualizarDimensiones = Joi.object({
  ancho_cm:       Joi.number().positive().required(),
  alto_cm:        Joi.number().positive().required(),
  profundidad_cm: Joi.number().positive().required(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validarBody(schema, body) {
  const { error, value } = schema.validate(body, { abortEarly: false, stripUnknown: true });
  if (error) throw error;
  return value;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function actualizarDimensiones(req, res, next) {
  try {
    const { sku } = req.params;
    const datos   = validarBody(schemaActualizarDimensiones, req.body);
    const producto = await usecases.actualizarDimensiones(productoRepo, sku, datos);
    res.json(producto);
  } catch (err) {
    next(err);
  }
}

async function validarDimensiones(req, res, next) {
  try {
    const { sku }  = req.params;
    const producto = await usecases.validarDimensiones(productoRepo, sku);
    res.json(producto);
  } catch (err) {
    next(err);
  }
}

async function listar(req, res, next) {
  try {
    const filtros   = validarBody(schemaListar, req.query);
    const productos = await usecases.listarProductos({ productoRepo, catalogo: catiClient }, filtros);
    res.json(productos);
  } catch (err) {
    next(err);
  }
}

async function obtenerPlanogramas(req, res, next) {
  try {
    const { sku }     = req.params;
    const apariciones = await usecases.obtenerPlanogramasDeProducto(productoRepo, sku);
    res.json(apariciones);
  } catch (err) {
    next(err);
  }
}

module.exports = { actualizarDimensiones, validarDimensiones, listar, obtenerPlanogramas };
