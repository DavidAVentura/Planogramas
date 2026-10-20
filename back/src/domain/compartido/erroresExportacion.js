/**
 * erroresExportacion.js
 * Errores de dominio comunes a las descargas .xlsx (consolidado de tiendas y productos por
 * planograma): tope de filas (422) y exportación en curso (503). Sin dependencias.
 */

const MENSAJE_EN_CURSO = 'Hay otra descarga en curso. Inténtalo en unos segundos.';

function errorExportacionDemasiadoGrande(filas, maximo) {
  const err = new Error(`La descarga tendría ${filas} filas y el máximo es ${maximo}`);
  err.status  = 422;
  err.code    = 'EXPORTACION_DEMASIADO_GRANDE';
  err.details = { filas, maximo };
  return err;
}

function errorExportacionEnCurso() {
  const err = new Error(MENSAJE_EN_CURSO);
  err.status = 503;
  err.code   = 'EXPORTACION_EN_CURSO';
  return err;
}

module.exports = { errorExportacionDemasiadoGrande, errorExportacionEnCurso };
