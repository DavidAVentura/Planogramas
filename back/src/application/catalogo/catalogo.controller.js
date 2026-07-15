/**
 * catalogo.controller.js
 * Proxy a CATI: extrae parámetros del request, llama al cliente CATI y formatea la respuesta.
 * Sin capa de dominio — el módulo no tiene reglas de negocio propias, solo cachea y traduce
 * el catálogo externo (ver Arquitectura/ESTRUCTURA_BACKEND.md). El único dato local es el
 * `sku_sustituto`, enriquecido desde la tabla `Producto` (ver producto.repository.js).
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

    const skuSustituto = await productoRepo.buscarSkuSustituto(sku);
    res.json({ ...producto, sku_sustituto: skuSustituto });
  } catch (err) {
    next(err);
  }
}

module.exports = { buscarProductos, obtenerProducto };
