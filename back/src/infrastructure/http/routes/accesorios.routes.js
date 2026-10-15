/**
 * accesorios.routes.js
 * Define las rutas del módulo Accesorios (catálogo con CRUD) y las conecta al controller.
 */

const { Router } = require('express');
const controller = require('../../../application/accesorios/accesorios.controller');

const { requiereAnalista } = require('../middlewares/autorizacion');

const router = Router();
router.use(requiereAnalista); // A transitoria: sin permiso propio en CAO (DT-11)

// GET /accesorios      — lista el catálogo, con filtro opcional por tipo
router.get('/',    controller.listar);

// GET /accesorios/:id  — detalle de un accesorio
router.get('/:id', controller.obtener);

// POST /accesorios     — da de alta un accesorio (código único)
router.post('/',   controller.crear);

// PATCH /accesorios/:id — partial update
router.patch('/:id', controller.editar);

// DELETE /accesorios/:id — elimina un accesorio que no está en uso (409 si lo usan)
router.delete('/:id', controller.eliminar);

module.exports = router;
