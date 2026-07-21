/**
 * catalogo.routes.js
 * Define las 3 rutas del módulo Catálogo y las conecta al controller.
 * "/productos/buscar" se declara antes de "/productos/:sku" para que Express no capture
 * "buscar" como valor de :sku.
 */

const { Router } = require('express');
const controller = require('../../../application/catalogo/catalogo.controller');

const router = Router();

// GET /catalog/productos/buscar — busca productos en CATI (?q=, subcategoria=, page=, pageSize=)
router.get('/productos/buscar', controller.buscarProductos);

// GET /catalog/productos/:sku — detalle de un producto, con sku_sustituto local
router.get('/productos/:sku', controller.obtenerProducto);

// GET /catalog/productos/:sku/stock — stock SAP por centro (proxy a CATI, sin filtrar)
router.get('/productos/:sku/stock', controller.obtenerStock);

module.exports = router;
