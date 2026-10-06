/**
 * routes/index.js
 * Router raíz — monta todos los sub-routers bajo /api/v1.
 * Agregar aquí cada nuevo módulo a medida que se desarrolle.
 */

const { Router }    = require('express');
const env           = require('../../../config/env');
const autenticacion = require('../middlewares/autenticacion');

const router = Router();

// ─── Health check ─────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Autenticación (todo lo que sigue exige un JWT CAO válido) ────────────────
router.use(autenticacion);
router.use('/auth',           require('./auth.routes'));

// ─── Módulos de negocio (se irán montando aquí) ───────────────────────────────
router.use('/planogramas',    require('./planogramas.routes'));
router.use('/versiones',      require('./versiones.routes'));
router.use('/gondolas',       require('./gondolas.routes'));
router.use('/adjuntos',       require('./adjuntos.routes'));
router.use('/evidencias',     require('./evidencias.routes'));
router.use('/niveles',        require('./niveles.routes'));
router.use('/secciones',      require('./secciones.routes'));
router.use('/posiciones',     require('./posiciones.routes'));
router.use('/accesorios',     require('./accesorios.routes'));
router.use('/tiendas',        require('./tiendas.routes'));
router.use('/asignaciones',   require('./asignaciones.routes'));
router.use('/jerarquia',      require('./jerarquia.routes'));
router.use('/catalog',        require('./catalogo.routes'));
router.use('/catalog',        require('./producto.routes'));
router.use('/agente-extractor', require('./agenteExtractor.routes'));
router.use('/voz',            require('./voz.routes'));

// ─── Soporte de pruebas Postman (solo local/DEV) ──────────────────────────────
if (env.pruebas.habilitadas && env.NODE_ENV !== 'production') {
  router.use('/pruebas',      require('./pruebas.routes'));
}

module.exports = router;
