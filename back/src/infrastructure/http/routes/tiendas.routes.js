/**
 * tiendas.routes.js
 * Define las 4 rutas del módulo Tiendas y las conecta al controller.
 */

const { Router } = require('express');
const controller = require('../../../application/tiendas/tiendas.controller');

const router = Router();

// GET /tiendas                      — lista tiendas activas, con filtros opcionales
router.get('/',                      controller.listar);

// POST /tiendas                     — crea una tienda (queda activa)
router.post('/',                     controller.crear);

// PATCH /tiendas/:id                — partial update de datos y/o estado (activar/desactivar)
router.patch('/:id',                 controller.editar);

// GET /tiendas/:tiendaId/planogramas — planogramas publicados asignados a la tienda
router.get('/:tiendaId/planogramas', controller.obtenerPlanogramas);

module.exports = router;
