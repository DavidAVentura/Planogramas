/**
 * jerarquia.routes.js
 * Define las 5 rutas del módulo Jerarquía y las conecta al controller.
 */

const { Router } = require('express');
const controller = require('../../../application/jerarquia/jerarquia.controller');

const router = Router();

// GET /jerarquia/areas        — lista áreas de la jerarquía comercial (proxy CATI, cache 30 min)
router.get('/areas', controller.listarAreas);

// GET /jerarquia/departamentos — lista departamentos de un área (?area=), proxy CATI, cache 30 min
router.get('/departamentos', controller.listarDepartamentos);

// GET /jerarquia/familias — lista familias de un departamento (?departamento=), proxy CATI, cache 30 min
router.get('/familias', controller.listarFamilias);

// GET /jerarquia/categorias — lista categorías de una familia (?familia=), proxy CATI, cache 30 min
router.get('/categorias', controller.listarCategorias);

// GET /jerarquia/subcategorias — lista subcategorías de una categoría (?categoria=), proxy CATI, cache 30 min
router.get('/subcategorias', controller.listarSubcategorias);

module.exports = router;
