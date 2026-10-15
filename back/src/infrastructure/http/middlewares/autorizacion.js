/**
 * autorizacion.js
 * Guards de autorización por ruta, sobre `req.usuario` (ya validado por autenticacion.js).
 * Las reglas viven en domain/compartido/permisos.js; aquí solo se traducen a 401/403.
 *   requiereAnalista      → regla A (todos PLA001–PLA008; transitoria, DT-11)
 *   requiereImplementador → regla I (PLA009 o PLA010 o A)
 *   requierePermiso(...)  → alguno de los códigos indicados
 * Cada guard expone `reglaAutorizacion` para que la prueba de completitud de rutas lo detecte.
 * Los guards no escriben nada en `req.usuario` (está congelado).
 */

const { PERMISOS, esCodigoPermiso, tieneAlguno, esAnalista, puedeLecturaCompartida } =
  require('../../../domain/compartido/permisos');

function errorProhibido() {
  const err = new Error('No tienes permiso para esta acción');
  err.status = 403;
  err.code   = 'FORBIDDEN';
  return err;
}

function errorNoAutenticado() {
  const err = new Error('Sesión no autenticada');
  err.status = 401;
  err.code   = 'UNAUTHORIZED';
  return err;
}

function crearGuard(regla, cumple) {
  const guard = (req, res, next) => {
    const usuario = req.usuario;
    if (!usuario) return next(errorNoAutenticado());
    if (!cumple(usuario)) {
      // Solo usuario, método, ruta (sin query) y regla: nunca el token ni headers.
      console.warn(`[autorizacion] 403 usuario=${usuario.numeroEmpleado} ${req.method} ${req.baseUrl}${req.path} regla=${JSON.stringify(regla)}`);
      return next(errorProhibido());
    }
    next();
  };
  guard.reglaAutorizacion = regla;
  return guard;
}

const requiereAnalista      = crearGuard('A', esAnalista);
const requiereImplementador = crearGuard('I', puedeLecturaCompartida);

function requierePermiso(...codigos) {
  if (codigos.length === 0 || !codigos.every(esCodigoPermiso)) {
    throw new Error(`requierePermiso: códigos inválidos (${codigos.join(', ') || 'ninguno'})`);
  }
  return crearGuard(Object.freeze([...codigos]), (u) => tieneAlguno(u, codigos));
}

module.exports = { requiereAnalista, requiereImplementador, requierePermiso, PERMISOS };
