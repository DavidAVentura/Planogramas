/**
 * auth.controller.js
 * Sesión del usuario autenticado vía CAO. El middleware de autenticación ya validó el token;
 * aquí solo se devuelve el usuario resultante.
 */

// GET /auth/sesion
function obtenerSesion(req, res) {
  res.json(req.usuario);
}

// POST /auth/keepalive — latido del front mientras la app está abierta. No hace nada por sí
// mismo: el middleware de autenticación ya validó el token y disparó la renovación de la sesión
// en CAO (caoAuthClient.mantenerSesionActiva). Si la sesión ya no es válida, responde 401 antes.
function mantenerSesion(req, res) {
  res.status(204).end();
}

module.exports = { obtenerSesion, mantenerSesion };
