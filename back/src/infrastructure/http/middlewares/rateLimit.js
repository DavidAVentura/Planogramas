/**
 * rateLimit.js
 * Limitadores de peticiones por IP (voz) y por usuario (consolidado). Responden con la forma estándar { error: { code, message } }.
 */

const { rateLimit } = require('express-rate-limit');

function crearLimiter({ windowMs, limit }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: {
          code:    'RATE_LIMITED',
          message: 'Demasiadas solicitudes, intenta de nuevo en unos segundos',
        },
      });
    },
  });
}

/**
 * Limitador por usuario autenticado (`req.usuario.numeroEmpleado`). Montarlo DESPUÉS de la
 * autorización: sin `req.usuario` no hay clave. Detrás del proxy de App Service la IP es la misma
 * para todos, por eso no se limita por IP.
 */
function crearLimiterPorUsuario({ windowMs, limit, mensaje }) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => String(req.usuario.numeroEmpleado),
    // Sin `skipFailedRequests`: devolvería el cupo al abortar el cliente y permitiría evadir el límite.
    // Los 400 no gastan cupo porque `validarQuery` los rechaza antes de este limitador.
    validate: { xForwardedForHeader: false },
    handler: (req, res) => {
      res.status(429).json({ error: { code: 'RATE_LIMITED', message: mensaje } });
    },
  });
}

// Limiter propio de /voz: el dictado segmentado hace ~1 request cada 2.75s y cada llamada consume
// créditos de OpenAI. Aparte de cualquier otro limiter para no bloquear el resto de la API.
const vozLimiter = crearLimiter({ windowMs: 60 * 1000, limit: 30 });

// Consolidado Tiendas (módulo 21): la descarga genera un .xlsx síncrono (5/min por usuario); el
// listado recalcula la base en cada request (60/min por usuario).
const exportacionLimiter = crearLimiterPorUsuario({
  windowMs: 60 * 1000, limit: 5, mensaje: 'Demasiadas descargas, espera un minuto e inténtalo de nuevo',
});
const consolidadoLimiter = crearLimiterPorUsuario({
  windowMs: 60 * 1000, limit: 60, mensaje: 'Demasiadas solicitudes, intenta de nuevo en unos segundos',
});

module.exports = { vozLimiter, exportacionLimiter, consolidadoLimiter, crearLimiterPorUsuario };
