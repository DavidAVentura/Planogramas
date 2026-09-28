/**
 * auth.routes.js
 * Rutas de sesión. Se montan después del middleware de autenticación, así que llegar aquí ya
 * implica un token CAO válido.
 */

const { Router } = require('express');
const controller = require('../../../application/auth/auth.controller');

const router = Router();

// GET /auth/sesion — usuario de la sesión actual (lo usa el front al entrar por /auth?token=)
router.get('/sesion', controller.obtenerSesion);

module.exports = router;
