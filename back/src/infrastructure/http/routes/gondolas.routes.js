/**
 * gondolas.routes.js
 * Define las rutas del módulo Góndolas que cuelgan de /gondolas y las conecta al controller.
 * El listado, la creación y el reordenamiento cuelgan de /versiones/:id/gondolas — ver versiones.routes.js.
 */

const { Router } = require('express');
const controller = require('../../../application/gondolas/gondolas.controller');

const router = Router();

// GET    /gondolas/:id           — detalle completo
router.get('/:id',          controller.obtener);

// GET    /gondolas/:id/resumen   — conteos de niveles/posiciones, previo a eliminar
router.get('/:id/resumen',  controller.obtenerResumen);

// PATCH  /gondolas/:id           — partial update de nombre, medidas o posición en tienda
router.patch('/:id',        controller.editar);

// DELETE /gondolas/:id           — elimina la góndola (y en cascada niveles/posiciones si forzar=true)
router.delete('/:id',       controller.eliminar);

module.exports = router;
