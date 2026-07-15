/**
 * accesorios.routes.js
 * Define las 2 rutas del módulo Accesorios y las conecta al controller.
 */

const { Router } = require('express');
const controller = require('../../../application/accesorios/accesorios.controller');

const router = Router();

// GET /accesorios      — lista el catálogo, con filtro opcional por tipo
router.get('/',    controller.listar);

// GET /accesorios/:id  — detalle de un accesorio
router.get('/:id', controller.obtener);

module.exports = router;
