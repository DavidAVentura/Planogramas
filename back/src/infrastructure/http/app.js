/**
 * app.js
 * Configura y exporta la instancia de Express.
 * No arranca el servidor — eso lo hace index.js.
 */

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const env        = require('../../config/env');
const router     = require('./routes');
const notFound   = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ─── Seguridad ────────────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({ origin: env.CORS_ORIGIN }));

// ─── Parseo de body ───────────────────────────────────────────────────────────
app.use(express.json());

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/v1', router);

// ─── 404 y manejo de errores (deben ir al final, en este orden) ───────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
