// Preferencias del modo voz del chat del Agente extractor, persistidas en localStorage. Si
// localStorage no está disponible o el valor guardado es inválido, se usa el valor por defecto.

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: string) {
  try {
    localStorage.setItem(clave, valor);
  } catch {
    // Sin localStorage la preferencia solo dura esta sesión.
  }
}

// ─── Método de dictado ───────────────────────────────────────────────────────

export type MetodoVoz = 'segmentado' | 'streaming';
const CLAVE_METODO_VOZ = 'agenteExtractor.metodoVoz';
const METODOS_VOZ: MetodoVoz[] = ['segmentado', 'streaming'];

export function cargarMetodoVoz(): MetodoVoz {
  const guardado = leer(CLAVE_METODO_VOZ);
  return METODOS_VOZ.find((m) => m === guardado) ?? 'streaming';
}

export function guardarMetodoVoz(metodo: MetodoVoz) {
  escribir(CLAVE_METODO_VOZ, metodo);
}

// ─── Motor de lectura de las respuestas ──────────────────────────────────────

export type MetodoTts = 'openai' | 'webspeech';
const CLAVE_METODO_TTS = 'agenteExtractor.metodoTts';
const METODOS_TTS: MetodoTts[] = ['openai', 'webspeech'];

export function cargarMetodoTts(): MetodoTts {
  const guardado = leer(CLAVE_METODO_TTS);
  return METODOS_TTS.find((m) => m === guardado) ?? 'openai';
}

export function guardarMetodoTts(metodo: MetodoTts) {
  escribir(CLAVE_METODO_TTS, metodo);
}

// ─── Voz de OpenAI (solo aplica con MetodoTts === 'openai') ──────────────────

// Debe ser la MISMA lista que la whitelist Joi de back/src/application/voz/voz.controller.js.
export const VOCES_TTS = ['fable', 'alloy', 'echo'] as const;
export type VozTts = (typeof VOCES_TTS)[number];
const CLAVE_VOZ_TTS = 'agenteExtractor.vozTts';

export function cargarVozTts(): VozTts {
  const guardado = leer(CLAVE_VOZ_TTS);
  return VOCES_TTS.find((v) => v === guardado) ?? 'fable';
}

export function guardarVozTts(voz: VozTts) {
  escribir(CLAVE_VOZ_TTS, voz);
}

// ─── Velocidad de lectura (mismo rango que valida el backend) ────────────────

export const VELOCIDAD_TTS_MIN = 1;
export const VELOCIDAD_TTS_MAX = 2;
export const VELOCIDAD_TTS_PASO = 0.1;
const CLAVE_VELOCIDAD_TTS = 'agenteExtractor.velocidadTts';
const VELOCIDAD_TTS_POR_DEFECTO = 1.7;

export function cargarVelocidadTts(): number {
  const guardado = leer(CLAVE_VELOCIDAD_TTS);
  const valor = guardado === null ? NaN : Number(guardado);
  const valida = Number.isFinite(valor) && valor >= VELOCIDAD_TTS_MIN && valor <= VELOCIDAD_TTS_MAX;
  return valida ? valor : VELOCIDAD_TTS_POR_DEFECTO;
}

export function guardarVelocidadTts(velocidad: number) {
  escribir(CLAVE_VELOCIDAD_TTS, String(velocidad));
}
