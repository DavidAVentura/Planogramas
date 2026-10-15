/**
 * adjuntos.routes.js
 * Define las rutas del módulo Adjuntos que cuelgan de /adjuntos y las conecta al controller.
 * El listado y la creación cuelgan de /versiones/:id/adjuntos — ver versiones.routes.js.
 */

const { Router } = require('express');
const controller = require('../../../application/adjuntos/adjuntos.controller');

// A transitoria (requiereAnalista) en las acciones sin permiso propio en CAO (DT-11); ver matriz en Arquitectura/SEGURIDAD_PERMISOS.md
const { requiereAnalista, requiereImplementador } = require('../middlewares/autorizacion');

const router = Router();

// GET    /adjuntos/:id/url-descarga — URL SAS de solo lectura para descargar directo desde Azure
router.get('/:id/url-descarga', requiereImplementador, controller.urlDescarga);

// POST   /adjuntos/:id/subida       — URL SAS para subir el archivo de reemplazo directo a Azure
router.post('/:id/subida', requiereAnalista, controller.solicitarSubidaReemplazo);

// PUT    /adjuntos/:id              — confirma el archivo ya subido y reemplaza el del adjunto (mismo id)
router.put('/:id', requiereAnalista, controller.reemplazar);

// DELETE /adjuntos/:id              — elimina el adjunto (fila + blob en Azure)
router.delete('/:id', requiereAnalista, controller.eliminar);

module.exports = router;
