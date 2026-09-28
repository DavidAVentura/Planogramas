/**
 * asignaciones.routes.js
 * Rutas de la vista Estructura: qué versión de cada planograma monta cada tienda.
 * Sin lógica — solo conecta cada ruta con su handler del controller.
 */

const { Router } = require('express');
const controller = require('../../../application/asignaciones/asignaciones.controller');

const router = Router();

// GET  /asignaciones            — matriz planograma × tienda (tiendas activas, versiones, asignaciones)
router.get('/',                   controller.obtenerMatriz);

// POST /asignaciones/ediciones  — guarda un grupo de cambios como una edición auditada
router.post('/ediciones',         controller.guardarEdicion);

// GET  /asignaciones/historial  — movimientos de una celda (?planogramaId=&tiendaId=)
router.get('/historial',          controller.listarHistorial);

module.exports = router;
