/**
 * auth.controller.js
 * Sesión del usuario autenticado vía CAO. El middleware de autenticación ya validó el token;
 * aquí solo se devuelve el usuario resultante.
 */

// GET /auth/sesion
function obtenerSesion(req, res) {
  res.json(req.usuario);
}

module.exports = { obtenerSesion };
