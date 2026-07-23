/**
 * agenteExtractor.routes.js
 * Define las rutas del Agente Extractor del Planograma y las conecta al controller.
 */

const { Router } = require('express');
const controller = require('../../../application/agenteExtractor/agenteExtractor.controller');

const router = Router();

// POST /agente-extractor/mensaje — envía un mensaje del chat y recibe la respuesta + borrador
router.post('/mensaje', controller.procesarMensaje);

module.exports = router;
