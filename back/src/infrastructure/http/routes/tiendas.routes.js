/**
 * tiendas.routes.js
 * Define las rutas del módulo Tiendas y las conecta al controller.
 * También monta, por compartir el prefijo /tiendas/:tiendaId, las rutas hijas de la vista del
 * Implementador: resumen y productos (módulo implementacion, 16) y la evidencia por versión
 * (módulo evidencias, 17). Descargar/eliminar una evidencia cuelgan de /evidencias/:id — ver
 * evidencias.routes.js.
 */

const { Router } = require('express');
const controller               = require('../../../application/tiendas/tiendas.controller');
const implementacionController = require('../../../application/implementacion/implementacion.controller');
const evidenciasController     = require('../../../application/evidencias/evidencias.controller');

const router = Router();

// GET /tiendas                      — lista tiendas activas, con filtros opcionales
router.get('/',                      controller.listar);

// POST /tiendas                     — crea una tienda (queda activa)
router.post('/',                     controller.crear);

// PATCH /tiendas/:id                — partial update de datos y/o estado (activar/desactivar)
router.patch('/:id',                 controller.editar);

// GET /tiendas/:tiendaId/planogramas — planogramas publicados asignados a la tienda
router.get('/:tiendaId/planogramas', controller.obtenerPlanogramas);

// GET /tiendas/:tiendaId/implementacion           — resumen Mi tienda (módulo implementacion)
router.get('/:tiendaId/implementacion',           implementacionController.obtenerResumen);

// GET /tiendas/:tiendaId/implementacion/productos — una fila por posición (módulo implementacion)
router.get('/:tiendaId/implementacion/productos', implementacionController.obtenerProductos);

// GET  /tiendas/:tiendaId/versiones/:versionId/evidencias — fotos por góndola (módulo evidencias)
router.get('/:tiendaId/versiones/:versionId/evidencias',  evidenciasController.listar);

// POST /tiendas/:tiendaId/versiones/:versionId/evidencias — sube una foto (módulo evidencias)
router.post('/:tiendaId/versiones/:versionId/evidencias', evidenciasController.agregar);

module.exports = router;
