/**
 * agenteExtractor.routes.js
 * Define las rutas del Agente Extractor del Planograma y las conecta al controller.
 */

const { Router } = require('express');
const controller = require('../../../application/agenteExtractor/agenteExtractor.controller');
const controllerImagen = require('../../../application/agenteExtractor/extractorImagenNumerada.controller');

const router = Router();

// POST /agente-extractor/mensaje — envía un mensaje del chat y recibe la respuesta + borrador
router.post('/mensaje', controller.procesarMensaje);

// POST /agente-extractor/imagen — interpreta una foto de mueble numerado (niveles/SKUs/facings)
router.post('/imagen', controllerImagen.procesarImagen);

module.exports = router;
