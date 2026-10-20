/**
 * Pruebas del semáforo de exportación: un único objeto compartido por el consolidado y por la
 * exportación de productos por planograma.
 */

const { describe, it } = require('node:test');
const assert           = require('node:assert/strict');

const { crearSemaforo, semaforoExportacion } = require('../../src/application/compartido/semaforo');

describe('semáforo', () => {
  it('toma y libera; no espera cuando está en uso', () => {
    const s = crearSemaforo(1);
    assert.equal(s.intentarTomar(), true);
    assert.equal(s.intentarTomar(), false);
    s.liberar();
    assert.equal(s.intentarTomar(), true);
  });

  it('liberar de más no deja el contador en negativo', () => {
    const s = crearSemaforo(1);
    s.liberar();
    assert.equal(s.intentarTomar(), true);
    assert.equal(s.intentarTomar(), false);
  });

  it('semaforoExportacion es el mismo objeto desde cualquier ruta de require', () => {
    const otraRuta = require('../../src/application/consolidado/../compartido/semaforo');
    assert.equal(otraRuta.semaforoExportacion, semaforoExportacion);
  });

  it('los controllers del consolidado y de implementación usan el mismo semáforo', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const leer = (r) => fs.readFileSync(path.join(__dirname, '../../src/application', r), 'utf8');
    assert.match(leer('consolidado/consolidado.controller.js'), /semaforoExportacion/);
    assert.match(leer('implementacion/implementacion.controller.js'), /semaforoExportacion/);
  });
});
