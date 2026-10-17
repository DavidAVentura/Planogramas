/**
 * index.js — CLI de la migración de datos DEV → PROD (script de un solo uso).
 * Uso (desde back/): ver Arquitectura/DESPLIEGUE_AZURE.md, "Migración de datos DEV → PROD".
 *   npm run migrar:dev-a-prod                                   → simulacro (siempre ROLLBACK)
 *   npm run migrar:dev-a-prod -- --solo-blobs --ejecutar --confirmar=db-planogramas
 *   npm run migrar:dev-a-prod -- --ejecutar --confirmar=db-planogramas [--forzar-vaciado]
 *   npm run migrar:dev-a-prod -- --verificar                    → solo lectura
 * Código de salida: 0 si terminó y cuadra; 1 en cualquier otro caso. No escribe archivos.
 */

const { parsearArgs, formatearError } = require('./plan');
const { migrar } = require('./orquestador');

async function main() {
  let conexiones = null;
  let exito = false;
  const estado = { abortado: false, trx: null };
  try {
    const opciones = parsearArgs(process.argv.slice(2));
    const bd = require('./bd');
    const { crearClienteBlobs } = require('./blobs');
    conexiones = bd.crearConexiones();
    const blobs = crearClienteBlobs();

    const alInterrumpir = () => {
      estado.abortado = true;
      // Solo se marca: el orquestador lo revisa entre pasos y hace el rollback cuando no hay consulta en curso.
      console.error('Interrumpido: se detiene en el siguiente punto seguro y la transacción se revierte');
    };
    process.once('SIGINT', alInterrumpir);
    process.once('SIGTERM', alInterrumpir);

    const log = Object.assign((mensaje) => console.log(mensaje), { tabla: (filas) => console.table(filas) });
    const { ok } = await migrar({ opciones, bd, blobs, conexiones, log, estado });
    exito = ok;
  } catch (err) {
    console.error(formatearError(err));
  } finally {
    if (conexiones) {
      await Promise.allSettled([conexiones.knexDev.destroy(), conexiones.knexProd.destroy()]);
    }
    process.exitCode = exito && !estado.abortado ? 0 : 1;
  }
}

main();
