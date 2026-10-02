/**
 * pruebas.routes.js
 * Rutas de soporte de la colección Postman. Solo se montan con PRUEBAS_HABILITADAS=true y fuera de
 * producción (ver routes/index.js).
 */

const { Router } = require('express');
const controller = require('../../../application/pruebas/pruebas.controller');

const router = Router();

// POST /pruebas/fixtures — siembra los datos que la API no puede crear (primer request de la colección)
router.post('/fixtures', controller.sembrarFixtures);

// POST /pruebas/limpieza — borra lo que creó la corrida (último request de la colección)
router.post('/limpieza', controller.limpiar);

module.exports = router;
