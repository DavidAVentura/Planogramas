/**
 * tiendas.routes.js
 * Define las 2 rutas del módulo Tiendas y las conecta al controller.
 */

const { Router } = require('express');
const controller = require('../../../application/tiendas/tiendas.controller');

const router = Router();

// GET /tiendas                      — lista tiendas activas, con filtros opcionales
router.get('/',                      controller.listar);

// GET /tiendas/:tiendaId/planogramas — planogramas publicados asignados a la tienda
router.get('/:tiendaId/planogramas', controller.obtenerPlanogramas);

module.exports = router;
