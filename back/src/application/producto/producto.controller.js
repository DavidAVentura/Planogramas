/**
 * producto.controller.js
 * Extrae parámetros del request, llama al usecase correspondiente y formatea la respuesta.
 * Escritura sobre la tabla local `Producto` (dimensiones físicas) — distinto del módulo
 * `catalogo`, que es un proxy de solo lectura a CATI sin capa de dominio propia.
 */

const Joi        = require('joi');
const usecases    = require('../../domain/producto/producto.usecases');
const productoRepo = require('../../infrastructure/repositories/producto.repository');

// ─── Esquemas de validación ───────────────────────────────────────────────────

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

module.exports = { actualizarDimensiones, validarDimensiones };
