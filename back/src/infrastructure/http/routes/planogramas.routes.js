/**
 * planogramas.routes.js
 * Define las 5 rutas del módulo Planogramas y las conecta al controller.
 */

const { Router }         = require('express');
const controller         = require('../../../application/planogramas/planogramas.controller');
const versionesController = require('../../../application/versiones/versiones.controller');

const router = Router();

// GET  /planogramas          — lista paginada con filtros opcionales
router.get('/',              controller.listar);

// POST /planogramas          — crea un nuevo planograma
router.post('/',             controller.crear);

// GET  /planogramas/:id      — detalle completo (metadatos + subcategorias + versiones)
router.get('/:id',           controller.obtener);

// PATCH /planogramas/:id     — partial update de metadatos y/o subcategorías
router.patch('/:id',         controller.editar);

// POST /planogramas/:id/archivar — archiva el planograma
router.post('/:id/archivar', controller.archivar);

// GET  /planogramas/:id/versiones  — lista las versiones del planograma (módulo versiones)
router.get('/:id/versiones',  versionesController.listar);

// POST /planogramas/:id/versiones  — crea una versión nueva (vacía o especial por tienda)
router.post('/:id/versiones', versionesController.crear);

module.exports = router;
