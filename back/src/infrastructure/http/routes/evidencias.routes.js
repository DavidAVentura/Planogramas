/**
 * evidencias.routes.js
 * Define las rutas del módulo Evidencias que cuelgan de /evidencias y las conecta al controller.
 * El listado y la subida cuelgan de /tiendas/:tiendaId/versiones/:versionId/evidencias — ver
 * tiendas.routes.js.
 */

const { Router } = require('express');
const controller = require('../../../application/evidencias/evidencias.controller');

const router = Router();

// GET    /evidencias/:id/descargar — descarga la foto (streaming desde Azure Blob Storage)
router.get('/:id/descargar', controller.descargar);

// DELETE /evidencias/:id           — elimina la foto (fila + blob); solo quien la subió
router.delete('/:id',         controller.eliminar);

module.exports = router;
