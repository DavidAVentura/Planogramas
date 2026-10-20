/**
 * implementacion.routes.js
 * Vista Por versión del Analista (módulo implementacion, 16). Las rutas del Implementador cuelgan
 * de la tienda y viven en tiendas.routes.js; estas no dependen de una tienda (es opcional).
 */

const { Router } = require('express');
const controller = require('../../../application/implementacion/implementacion.controller');

const { schemaExportar } = require('../../../application/implementacion/implementacion.schemas');
const { requiereAnalista } = require('../middlewares/autorizacion');
const { validarCuerpo } = require('../middlewares/validarCuerpo');
const { exportacionPorVersionLimiter, productosPorVersionLimiter } = require('../middlewares/rateLimit');

const router = Router();
router.use(requiereAnalista); // A transitoria: sin permiso propio en CAO (DT-11)

// GET /implementacion/versiones?incluir=         — versiones publicadas y piloto (+ las de `incluir`)
router.get('/versiones', controller.listarVersiones);

// GET /implementacion/productos?versionIds=&tiendaId=&area=&departamento= — una fila por posición; la
// tienda solo agrega inventario y la jerarquía (CATI) acota las filas. Limitador por usuario (60/min).
router.get('/productos', productosPorVersionLimiter, controller.obtenerProductosPorVersion);

// POST /implementacion/productos/exportar — descarga .xlsx (LISTA | PIVOTE). El cuerpo (hasta 512 kb) se
// parsea en app.js. Orden: autorización (403 antes que 400) → validación (los 400 no gastan cupo) →
// limitador (5/min por usuario) → controller.
router.post('/productos/exportar', validarCuerpo(schemaExportar), exportacionPorVersionLimiter, controller.exportar);

module.exports = router;
