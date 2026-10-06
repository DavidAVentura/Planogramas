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
// Límite subido de 100kb (default) a 8mb: el Agente Extractor de Imagen Numerada y las evidencias
// (hasta 5MB) reciben fotos en base64. Los adjuntos de versión no pasan por aquí: se suben directo
// a Azure Blob con URL SAS.
// El Agente Importador de PDF recibe el PDF completo en base64 (hasta 15MB decodificado, ver
// extractorPdfPlanograma.controller.js): esa ruta se parsea antes con su propio límite y el
// parser general la deja pasar porque el body ya viene leído.
app.use('/api/v1/agente-extractor/pdf-planograma', express.json({ limit: '21mb' }));
app.use(express.json({ limit: '8mb' }));

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api/v1', router);

// ─── 404 y manejo de errores (deben ir al final, en este orden) ───────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
