/**
 * auth.controller.js
 * Sesión del usuario autenticado vía CAO. El middleware de autenticación ya validó el token;
 * aquí se devuelve el usuario con una lista blanca de campos (nunca el objeto completo) más las
 * capacidades calculadas por el dominio, que el front usa para decidir modos y navegación.
 */

const { capacidades } = require('../../domain/compartido/permisos');

// GET /auth/sesion
function obtenerSesion(req, res) {
  const u = req.usuario;
  res.json({
    id:             u.id,
    numeroEmpleado: u.numeroEmpleado,
    usuario:        u.usuario,
    nombre:         u.nombre,
    correo:         u.correo,
    perfiles:       u.perfiles,
    permisos:       u.permisos,
    capacidades:    capacidades(u),
    tiendas:        u.tiendas,
  });
}

// POST /auth/keepalive — latido del front mientras la app está abierta. No hace nada por sí
// mismo: el middleware de autenticación ya validó el token y disparó la renovación de la sesión
// en CAO (caoAuthClient.mantenerSesionActiva). Si la sesión ya no es válida, responde 401 antes.
function mantenerSesion(req, res) {
  res.status(204).end();
}

module.exports = { obtenerSesion, mantenerSesion };
