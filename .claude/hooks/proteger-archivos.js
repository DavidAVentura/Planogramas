#!/usr/bin/env node
/**
 * Hook PreToolUse (Edit|Write): bloquea la edición de archivos que nunca se tocan a mano.
 * Sale con código 2 y el motivo por stderr para que Claude Code rechace la herramienta.
 *
 * - back/.env (y cualquier .env salvo .env.example): secretos por ambiente.
 * - src/data/realData.js: generado desde los Excel de data-fuente/.
 * - postman/**: espejo auto-generado por Postman Cloud; solo la colección de import es editable.
 */

const path = require('path');

const COLECCION_EDITABLE = 'planogramas-import.postman_collection.json';

/** Git Bash entrega rutas tipo /c/Users/...; en Windows se convierten a C:/Users/... */
function normalizar(ruta) {
  return process.platform === 'win32' ? ruta.replace(/^\/([a-zA-Z])\//, '$1:/') : ruta;
}

function motivoBloqueo(rutaRelativa) {
  const partes = rutaRelativa.split('/');
  const nombre = partes[partes.length - 1];

  if (/^\.env(\..+)?$/.test(nombre) && nombre !== '.env.example') {
    return `${rutaRelativa} contiene secretos por ambiente; edítalo tú a mano (usa .env.example para documentar variables nuevas).`;
  }
  if (rutaRelativa === 'src/data/realData.js') {
    return 'src/data/realData.js es generado desde data-fuente/*.xlsx; regéneralo en lugar de editarlo.';
  }
  if (partes[0] === 'postman' && nombre !== COLECCION_EDITABLE) {
    return `postman/ es un espejo de Postman Cloud; solo se edita postman/${COLECCION_EDITABLE}.`;
  }
  return null;
}

let entrada = '';
process.stdin.on('data', (c) => { entrada += c; });
process.stdin.on('end', () => {
  let archivo;
  try {
    archivo = JSON.parse(entrada).tool_input?.file_path;
  } catch {
    process.exit(0);
  }
  if (!archivo) process.exit(0);

  const raiz = normalizar(process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..'));
  const relativa = path.relative(path.resolve(raiz), path.resolve(normalizar(archivo))).split(path.sep).join('/');
  if (relativa.startsWith('..')) process.exit(0);

  const motivo = motivoBloqueo(relativa);
  if (motivo) {
    process.stderr.write(`Bloqueado por .claude/hooks/proteger-archivos.js: ${motivo}\n`);
    process.exit(2);
  }
  process.exit(0);
});
