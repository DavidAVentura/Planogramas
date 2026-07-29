/**
 * gondolas.routes.js
 * Define las rutas del módulo Góndolas que cuelgan de /gondolas y las conecta al controller.
 * El listado, la creación y el reordenamiento de góndolas cuelgan de /versiones/:id/gondolas —
 * ver versiones.routes.js. El listado, la creación y el reordenamiento de niveles cuelgan de
 * /gondolas/:id/niveles (módulo niveles) y se montan aquí porque comparten el prefijo /gondolas.
 */

const { Router }        = require('express');
const controller        = require('../../../application/gondolas/gondolas.controller');
const nivelesController = require('../../../application/niveles/niveles.controller');

const router = Router();

// GET    /gondolas/:id           — detalle completo
router.get('/:id',          controller.obtener);

// GET    /gondolas/:id/resumen   — conteos de niveles/posiciones, previo a eliminar
router.get('/:id/resumen',  controller.obtenerResumen);

// GET    /gondolas/:id/niveles       — lista los niveles de la góndola (módulo niveles)
router.get('/:id/niveles',        nivelesController.listar);

// POST   /gondolas/:id/niveles       — agrega un nivel a la góndola (módulo niveles)
router.post('/:id/niveles',       nivelesController.agregar);

// PATCH  /gondolas/:id/niveles/orden — reordena los niveles de la góndola (módulo niveles)
router.patch('/:id/niveles/orden', nivelesController.reordenar);

// PATCH  /gondolas/:id           — partial update de nombre, medidas o posición en tienda
router.patch('/:id',        controller.editar);

// DELETE /gondolas/:id           — elimina la góndola (y en cascada niveles/posiciones si forzar=true)
router.delete('/:id',       controller.eliminar);

module.exports = router;
