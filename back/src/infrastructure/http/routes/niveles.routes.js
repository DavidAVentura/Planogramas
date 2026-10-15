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

const { requiereAnalista, requierePermiso, PERMISOS } = require('../middlewares/autorizacion');

// C: contenido de la versión (editor PLA005 o lienzo PLA006); siempre junto con la regla A
const editarContenido = requierePermiso(PERMISOS.EDITAR_VERSION, PERMISOS.EDITAR_LIENZO);

const router = Router();
router.use(requiereAnalista); // A transitoria: sin permiso propio en CAO (DT-11)

// GET    /niveles/:id           — detalle completo
router.get('/:id',          controller.obtener);

// GET    /niveles/:id/resumen   — conteo de posiciones, previo a eliminar
router.get('/:id/resumen',  controller.obtenerResumen);

// GET    /niveles/:id/posiciones — lista las posiciones del nivel (módulo posiciones)
router.get('/:id/posiciones',  posicionesController.listar);

// POST   /niveles/:id/posiciones — agrega una posición al nivel (módulo posiciones)
router.post('/:id/posiciones', editarContenido, posicionesController.agregar);

// PATCH  /niveles/:id           — partial update de altura, accesorio, ancho o notas
router.patch('/:id', editarContenido, controller.editar);

// DELETE /niveles/:id           — elimina el nivel (y en cascada posiciones si forzar=true)
router.delete('/:id', editarContenido, controller.eliminar);

module.exports = router;
