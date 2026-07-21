/**
 * catalogo.controller.js
 * Proxy a CATI: extrae parámetros del request, llama al cliente CATI y formatea la respuesta.
 * Sin capa de dominio — el módulo no tiene reglas de negocio propias, solo cachea y traduce
 * el catálogo externo (ver Arquitectura/ESTRUCTURA_BACKEND.md). Los datos locales
 * (`sku_sustituto`, `fuente_dimensiones`, `dimensiones_validadas`) se enriquecen desde la
 * tabla `Producto` (ver producto.repository.js). La escritura de dimensiones vive en el
 * módulo `producto` (domain/producto + application/producto), no acá.
 */

const Joi             = require('joi');
const catiClient       = require('../../infrastructure/cati/catiClient');
const productoRepo     = require('../../infrastructure/repositories/producto.repository');

// ─── Esquemas de validación ───────────────────────────────────────────────────

const schemaBuscar = Joi.object({
  q:            Joi.string().trim().min(2).required(),
  subcategoria: Joi.string().trim().optional(),
  page:         Joi.number().integer().min(1).default(1),
  pageSize:     Joi.number().integer().min(1).max(50).default(20),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function validarQuery(schema, query) {
  const { error, value } = schema.validate(query, { abortEarly: false, stripUnknown: true });
  if (error) throw error;
  return value;
}

function errorNotFound(sku) {
  const err = new Error(`Producto ${sku} no encontrado en el catálogo`);
  err.status = 404;
  err.code   = 'NOT_FOUND';
  return err;
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function buscarProductos(req, res, next) {
  try {
    const filtros   = validarQuery(schemaBuscar, req.query);
    const productos = await catiClient.buscarProductos(filtros);
    res.json(productos);
  } catch (err) {
    next(err);
  }
}

async function obtenerProducto(req, res, next) {
  try {
    const { sku }  = req.params;
    const producto = await catiClient.obtenerProducto(sku);
    if (!producto) throw errorNotFound(sku);

    const local = await productoRepo.buscarPorSku(sku);
    res.json({
      ...producto,
      sku_sustituto:          local?.sku_sustituto ?? null,
      fuente_dimensiones:     local?.fuente_dimensiones ?? null,
      dimensiones_validadas:  local?.dimensiones_validadas ?? false,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { buscarProductos, obtenerProducto };
