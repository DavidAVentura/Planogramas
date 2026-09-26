/**
 * voz.routes.js
 * Rutas del modo voz del chat (voz→texto y texto→voz) y su conexión al controller.
 * TODO(auth): proteger con el middleware de autenticación cuando exista — consumen créditos de OpenAI.
 */

const { Router } = require('express');
const controller = require('../../../application/voz/voz.controller');
const { vozLimiter } = require('../middlewares/rateLimit');

const router = Router();

router.use(vozLimiter);

// POST /voz/transcribir — transcribe un segmento de audio (base64) del dictado segmentado
router.post('/transcribir', controller.transcribir);

// POST /voz/sesion-streaming — secreto efímero para abrir la sesión Realtime desde el navegador
router.post('/sesion-streaming', controller.crearSesionStreaming);

// POST /voz/tts — sintetiza el texto a audio mp3 (respuesta binaria audio/mpeg)
router.post('/tts', controller.sintetizar);

module.exports = router;
