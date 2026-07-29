/**
 * notFound.js
 * Catch-all para rutas no registradas. Debe registrarse ANTES del errorHandler.
 */

module.exports = function notFound(req, res) {
  res.status(404).json({
    error: {
      code:    'NOT_FOUND',
      message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    },
  });
};
