/**
 * jerarquia.routes.js
 * Define las 2 rutas del módulo Jerarquía y las conecta al controller.
 */

const { Router } = require('express');
const controller = require('../../../application/jerarquia/jerarquia.controller');

const router = Router();

// GET /jerarquia/areas        — lista áreas de la jerarquía comercial (proxy CATI, cache 30 min)
router.get('/areas', controller.listarAreas);

// GET /jerarquia/departamentos — lista departamentos de un área (?area=), proxy CATI, cache 30 min
router.get('/departamentos', controller.listarDepartamentos);

module.exports = router;
