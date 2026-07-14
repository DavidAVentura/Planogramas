/**
 * niveles.routes.js
 * Define las rutas del módulo Niveles que cuelgan de /niveles y las conecta al controller.
 * El listado, la creación y el reordenamiento cuelgan de /gondolas/:id/niveles — ver gondolas.routes.js.
 * El listado y la creación de posiciones cuelgan de /niveles/:id/posiciones (módulo posiciones)
 * y se montan aquí porque comparten el prefijo /niveles.
 */

const { Router }            = require('express');
const controller            = require('../../../application/niveles/niveles.controller');
const posicionesController  = require('../../../application/posiciones/posiciones.controller');

const router = Router();

// GET    /niveles/:id           — detalle completo
router.get('/:id',          controller.obtener);

// GET    /niveles/:id/resumen   — conteo de posiciones, previo a eliminar
router.get('/:id/resumen',  controller.obtenerResumen);

// GET    /niveles/:id/posiciones — lista las posiciones del nivel (módulo posiciones)
router.get('/:id/posiciones',  posicionesController.listar);

// POST   /niveles/:id/posiciones — agrega una posición al nivel (módulo posiciones)
router.post('/:id/posiciones', posicionesController.agregar);

// PATCH  /niveles/:id           — partial update de altura, accesorio, ancho o notas
router.patch('/:id',        controller.editar);

// DELETE /niveles/:id           — elimina el nivel (y en cascada posiciones si forzar=true)
router.delete('/:id',       controller.eliminar);

module.exports = router;
