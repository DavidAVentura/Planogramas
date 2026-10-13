#!/usr/bin/env node
/**
 * Hook PostToolUse (Edit|Write): corre el linter que corresponde solo sobre el archivo editado y,
 * si encuentra errores, se los devuelve a Claude (código 2 + stderr) para que los corrija en el
 * mismo paso. Los avisos (p. ej. archivos en la lista legacy de stylelint) no interrumpen.
 *
 * - front/src/**.css         → stylelint (tokens del design system, ver front/.stylelintrc.json)
 * - front/src/**.ts / .tsx   → oxlint
 * - back/**.js               → node --check (sintaxis)
 */

const path = require('path');
const { execFileSync } = require('child_process');

/** Git Bash entrega rutas tipo /c/Users/...; en Windows se convierten a C:/Users/... */
function normalizar(ruta) {
  return process.platform === 'win32' ? ruta.replace(/^\/([a-zA-Z])\//, '$1:/') : ruta;
}

function correr(comando, args, cwd) {
  try {
    execFileSync(comando, args, { cwd, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
    return null;
  } catch (err) {
    return `${err.stdout ?? ''}${err.stderr ?? ''}`.trim() || err.message;
  }
}

let entrada = '';
process.stdin.on('data', (c) => { entrada += c; });
process.stdin.on('end', () => {
  let archivo;
  try {
    const datos = JSON.parse(entrada);
    archivo = datos.tool_input?.file_path ?? datos.tool_response?.filePath;
  } catch {
    process.exit(0);
  }
  if (!archivo) process.exit(0);

  const raiz     = path.resolve(normalizar(process.env.CLAUDE_PROJECT_DIR || path.resolve(__dirname, '..', '..')));
  const absoluta = path.resolve(normalizar(archivo));
  const relativa = path.relative(raiz, absoluta).split(path.sep).join('/');
  const front    = path.join(raiz, 'front');
  const enFront  = relativa.startsWith('front/src/');

  let error = null;
  if (enFront && relativa.endsWith('.css')) {
    error = correr('npx', ['--no-install', 'stylelint', '--quiet', `"${absoluta}"`], front);
  } else if (enFront && /\.tsx?$/.test(relativa)) {
    error = correr('npx', ['--no-install', 'oxlint', '--quiet', `"${absoluta}"`], front);
  } else if (relativa.startsWith('back/') && relativa.endsWith('.js') && !relativa.includes('node_modules')) {
    error = correr('node', ['--check', `"${absoluta}"`], raiz);
  }

  if (error) {
    process.stderr.write(`Lint falló en ${relativa} — corrígelo antes de seguir:\n${error}\n`);
    process.exit(2);
  }
  process.exit(0);
});
