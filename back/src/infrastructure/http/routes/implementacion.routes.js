/**
 * implementacion.routes.js
 * Vista Por versión del Analista (módulo implementacion, 16). Las rutas del Implementador cuelgan
 * de la tienda y viven en tiendas.routes.js; estas no dependen de una tienda (es opcional).
 */

const { Router } = require('express');
const controller = require('../../../application/implementacion/implementacion.controller');

const router = Router();

// GET /implementacion/versiones?incluir=         — versiones publicadas y piloto (+ las de `incluir`)
router.get('/versiones', controller.listarVersiones);

// GET /implementacion/productos?versionIds=&tiendaId= — una fila por posición; la tienda solo agrega inventario
router.get('/productos', controller.obtenerProductosPorVersion);

module.exports = router;
