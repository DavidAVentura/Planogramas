/**
 * consolidado.routes.js
 * Consolidado Tiendas (módulo 21): solo lectura, solo analista. Los limitadores por usuario van
 * después de la autorización (necesitan `req.usuario`).
 */

const { Router } = require('express');
const controller = require('../../../application/consolidado/consolidado.controller');

const { schemaListado, schemaExportar } = require('../../../application/consolidado/consolidado.schemas');
const { requiereAnalista } = require('../middlewares/autorizacion');
const { validarQuery } = require('../middlewares/validarQuery');
const { exportacionLimiter, consolidadoLimiter } = require('../middlewares/rateLimit');

const router = Router();
router.use(requiereAnalista); // A transitoria (DT-11)

// GET /consolidado/tiendas/filtros  — opciones de los modales (tiendas y versiones montables)
router.get('/tiendas/filtros', controller.filtros);

// GET /consolidado/tiendas/exportar — descarga .xlsx (DETALLADO | AGREGADO | HOJAS)
// Orden: autorización → validación (los 400 no gastan cupo) → limitador → controller.
router.get('/tiendas/exportar', validarQuery(schemaExportar), exportacionLimiter, controller.exportar);

// GET /consolidado/tiendas          — listado paginado SKU–tienda–versión
router.get('/tiendas', validarQuery(schemaListado), consolidadoLimiter, controller.listar);

module.exports = router;
