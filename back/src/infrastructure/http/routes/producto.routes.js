/**
 * producto.routes.js
 * Define las rutas de escritura sobre la tabla local `Producto` y las conecta al controller.
 * Se monta bajo el mismo prefijo /catalog que catalogo.routes.js (mismo recurso público,
 * "/catalog/productos/{sku}"), pero es un archivo/controller separado a propósito: catalogo
 * es un proxy de solo lectura a CATI sin capa de dominio, mientras que estas rutas sí tienen
 * reglas de negocio propias (ver domain/producto/).
 */

const { Router } = require('express');
const controller = require('../../../application/producto/producto.controller');

const router = Router();

// PATCH /catalog/productos/:sku/dimensiones          — actualiza ancho/alto/profundidad
router.patch('/productos/:sku/dimensiones', controller.actualizarDimensiones);

// PATCH /catalog/productos/:sku/dimensiones/validar  — confirma las medidas existentes
router.patch('/productos/:sku/dimensiones/validar', controller.validarDimensiones);

module.exports = router;
