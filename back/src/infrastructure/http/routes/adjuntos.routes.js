/**
 * adjuntos.routes.js
 * Define las rutas del módulo Adjuntos que cuelgan de /adjuntos y las conecta al controller.
 * El listado y la creación cuelgan de /versiones/:id/adjuntos — ver versiones.routes.js.
 */

const { Router } = require('express');
const controller = require('../../../application/adjuntos/adjuntos.controller');

const router = Router();

// GET    /adjuntos/:id/url-descarga — URL SAS de solo lectura para descargar directo desde Azure
router.get('/:id/url-descarga', controller.urlDescarga);

// POST   /adjuntos/:id/subida       — URL SAS para subir el archivo de reemplazo directo a Azure
router.post('/:id/subida',      controller.solicitarSubidaReemplazo);

// PUT    /adjuntos/:id              — confirma el archivo ya subido y reemplaza el del adjunto (mismo id)
router.put('/:id',              controller.reemplazar);

// DELETE /adjuntos/:id              — elimina el adjunto (fila + blob en Azure)
router.delete('/:id',           controller.eliminar);

module.exports = router;
