/**
 * semaforo.js
 * Semáforo de exclusión en memoria (por proceso): limita cuántas exportaciones .xlsx se generan a
 * la vez, porque la generación bloquea el event loop. `intentarTomar` no espera: devuelve false.
 */

function crearSemaforo(maximo) {
  let enUso = 0;
  return {
    intentarTomar() {
      if (enUso >= maximo) return false;
      enUso += 1;
      return true;
    },
    liberar() {
      if (enUso > 0) enUso -= 1;
    },
  };
}

// Un solo proceso, una sola exportación .xlsx a la vez (consolidado y productos por planograma
// comparten el mismo semáforo: la generación bloquea el event loop).
const semaforoExportacion = crearSemaforo(1);

module.exports = { crearSemaforo, semaforoExportacion };
