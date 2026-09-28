/**
 * rateLimit.js
 * Limitadores de peticiones por IP. Responden con la forma estándar { error: { code, message } }.
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

// Limiter propio de /voz: el dictado segmentado hace ~1 request cada 2.75s y cada llamada consume
// créditos de OpenAI. Aparte de cualquier otro limiter para no bloquear el resto de la API.
const vozLimiter = crearLimiter({ windowMs: 60 * 1000, limit: 30 });

module.exports = { vozLimiter };
