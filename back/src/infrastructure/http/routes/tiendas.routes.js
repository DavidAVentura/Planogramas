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

// A transitoria (requiereAnalista) en las acciones sin permiso propio en CAO (DT-11); ver matriz en Arquitectura/SEGURIDAD_PERMISOS.md
const { requiereAnalista, requiereImplementador, requierePermiso, PERMISOS } = require('../middlewares/autorizacion');

const router = Router();

// GET /tiendas                      — lista tiendas activas, con filtros opcionales
router.get('/', requiereImplementador, controller.listar);

// POST /tiendas                     — crea una tienda (queda activa)
router.post('/', requiereAnalista, requierePermiso(PERMISOS.CREAR_TIENDA), controller.crear);

// PATCH /tiendas/:id                — partial update de datos y/o estado (activar/desactivar)
router.patch('/:id', requiereAnalista, requierePermiso(PERMISOS.EDITAR_TIENDA), controller.editar);

// GET /tiendas/:tiendaId/planogramas — planogramas publicados asignados a la tienda
router.get('/:tiendaId/planogramas', requiereImplementador, controller.obtenerPlanogramas);

// GET /tiendas/:tiendaId/implementacion           — resumen Mi tienda (módulo implementacion)
router.get('/:tiendaId/implementacion', requiereImplementador, implementacionController.obtenerResumen);

// GET /tiendas/:tiendaId/implementacion/productos — una fila por posición (módulo implementacion)
router.get('/:tiendaId/implementacion/productos', requierePermiso(PERMISOS.PRODUCTOS_TIENDA), implementacionController.obtenerProductos);

// GET  /tiendas/:tiendaId/versiones/:versionId/evidencias — fotos por góndola (módulo evidencias)
router.get('/:tiendaId/versiones/:versionId/evidencias', requiereImplementador, evidenciasController.listar);

// POST /tiendas/:tiendaId/versiones/:versionId/evidencias — sube una foto (módulo evidencias)
router.post('/:tiendaId/versiones/:versionId/evidencias', requiereImplementador, evidenciasController.agregar);

module.exports = router;
