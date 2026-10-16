/** Lectura del Excel de productos de un planograma (una fila por SKU con sus ganchos, cantidades,
 * mín./máx. y accesorios de montaje) al formato de POST /versiones/:id/importar-productos.
 *
 * Los encabezados se reconocen sin importar mayúsculas ni tildes. El archivo trae un bloque de
 * columnas por tamaño de tienda (sufijo `_TG`, `_TM`, `_TE`; ganchos `TG1`…, `TM1`…, `TE1`…) y se
 * lee SOLO el del tipo de la versión destino (GRANDE → TG, MEDIANA → TM, EXPRESS → TE); las columnas
 * de los otros bloques se ignoran. Una columna sin sufijo (`SKU`, `Descripcion`, `Modo`, o `Facings`
 * de un archivo antiguo) es común y vale para cualquier tipo; si un campo tiene columna con sufijo
 * del bloque y sin sufijo, gana la del bloque. Si el archivo trae bloques y no el de la versión, no
 * se importa (bloque ausente); un bloque sin productos tampoco (bloque vacío). Un `Planograma_<S>`
 * que nombra otro tamaño (sigla TG/TM/TE ajena como palabra) es error bloqueante. Se ignoran las
 * columnas que no se guardan (jerarquía, marca, modelo, temporada, fecha, sustitución y su
 * justificación); la columna planograma se usa para avisar si el archivo es de otro planograma y
 * para el error de bloque ajeno de arriba.
 *
 * Reglas de lectura:
 * - `//` separa varios accesorios en `Nombre_accesorio_*` y `Tamano_accesorio_*` (un `/` simple no).
 *   Nombres y tamaños se combinan según `accesoriosDeCeldas`.
 * - Ganchos: `54` es un gancho normal y `54E` uno de exhibición; son distintos y se conservan tal cual.
 * - Las cantidades son enteros estrictos. Cualquier celda mal formada o fuera de rango es un error
 *   bloqueante (`errores`, con fila, columna y motivo) y no se importa nada: con errores,
 *   `productos` queda vacío. Las filas vacías, sin SKU o sin facings se omiten (`filasOmitidas`). */

import type { DecisionPosicion, ModoPosicion, PerfilRedondeo } from '../types/posicion';
import type { AccesorioExcel, ProductoExcel } from '../types/importacionProductos';
import type { Gancho } from '../types/gancho';
import type { VersionTipo } from '../types/version';
import { SIGLA_TIPO_TIENDA, TIPO_TIENDA_META } from '../constants/tiendas';
import { esGanchoExhibicion, leerGancho, textoGancho } from '../domain/ganchos/gancho';
import { normalizarCodigoAccesorio } from '../domain/accesorios/codigoAccesorio';

/** Fila de encabezados: la primera, dentro de las primeras filas, que tenga una columna "SKU". */
const FILAS_MAXIMAS_ENCABEZADO = 15;

const MAX_ACCESORIOS = 10;
const MAX_NOMBRE_ACCESORIO = 50;
const MAX_SKU = 50;
const MAX_TEXTO = 500;
const MAX_FACINGS = 100;
const MAX_TAMANO_PULGADAS = 999;
const MAX_GANCHO = 999999;

export type SiglaBloque = 'TG' | 'TM' | 'TE';

/** GRANDE → 'TG', MEDIANA → 'TM', EXPRESS → 'TE'. */
export function siglaBloque(tipo: VersionTipo): SiglaBloque {
  return SIGLA_TIPO_TIENDA[tipo];
}

type Campo =
  | 'sku'
  | 'descripcion'
  | 'modo'
  | 'decision_final'
  | 'planograma'
  | 'facings'
  | 'cantidad_x_facing'
  | 'cantidad_facing_vertical'
  | 'min_estetico'
  | 'capacidad_maxima'
  | 'nombre_accesorio'
  | 'tamano_accesorio'
  | 'perfil_redondeo'
  | 'min_final'
  | 'max_final'
  | 'observaciones';

const CAMPOS: Campo[] = [
  'sku', 'descripcion', 'modo', 'decision_final', 'planograma',
  'facings', 'cantidad_x_facing', 'cantidad_facing_vertical', 'min_estetico', 'capacidad_maxima',
  'nombre_accesorio', 'tamano_accesorio', 'perfil_redondeo', 'min_final', 'max_final', 'observaciones',
];

/** Columnas sin las cuales no se puede importar. */
const OBLIGATORIAS: Campo[] = ['sku', 'facings'];

type Celda = string | number | boolean | Date | null | undefined;

/** Un error bloqueante de una celda del archivo. */
export interface ErrorLectura {
  /** Fila de Excel (1-based). */
  fila: number;
  /** Encabezado tal como viene en el archivo, ej. "Tamano_accesorio_TG". */
  columna: string;
  /** Letra de la columna, ej. "AB". */
  letra: string;
  motivo: string;
  esperado: string;
}

/** Celda `Nombre_accesorio_*` de la que salió un código, para señalarla si no está en el catálogo. */
export interface OrigenAccesorio {
  fila: number;
  columna: string;
  letra: string;
  /** Normalizado con `normalizarCodigoAccesorio`. */
  codigo: string;
}

export interface LecturaExcelProductos {
  /** Sigla del bloque que corresponde a la versión. */
  bloque: SiglaBloque;
  /** Siglas presentes en la fila de encabezado (sufijo `_xx` o prefijo de gancho), sin repetir, en orden de aparición. */
  bloquesEnArchivo: SiglaBloque[];
  /** Vacío si hay errores. */
  productos: ProductoExcel[];
  /** Valores de la columna Planograma_XX (ej. "PINTURAS TG-10"), para avisar si no es la versión. */
  planogramas: string[];
  columnasFaltantes: string[];
  /** Errores bloqueantes, ordenados por fila y luego por columna. */
  errores: ErrorLectura[];
  /** Filas que se omiten sin ser error (sin SKU o sin facings). */
  filasOmitidas: { fila: number; motivo: string }[];
  /** Una por (fila, código distinto) de los productos leídos; vacío si hay errores. */
  origenesAccesorio: OrigenAccesorio[];
}

type ResultadoCelda<T> =
  | { ok: true; valor: T }
  | { ok: false; motivo: string; esperado: string };

export type ResultadoAccesorios =
  | { ok: true; valor: AccesorioExcel[] }
  | { ok: false; campo: 'nombre_accesorio' | 'tamano_accesorio'; motivo: string; esperado: string };

export interface GrupoAccesorio extends AccesorioExcel {
  cantidad: number;
}

const bien = <T>(valor: T): ResultadoCelda<T> => ({ ok: true, valor });
const mal = (motivo: string, esperado: string): ResultadoCelda<never> => ({ ok: false, motivo, esperado });

function normalizarEncabezado(texto: Celda): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** `facings_tm` → { campo: 'facings', sigla: 'TM' }; `sku` → { campo: 'sku', sigla: null }. Solo tg|tm|te. */
function separarSufijo(clave: string): { campo: string; sigla: SiglaBloque | null } {
  const m = /^(.+)_(tg|tm|te)$/.exec(clave);
  return m ? { campo: m[1], sigla: m[2].toUpperCase() as SiglaBloque } : { campo: clave, sigla: null };
}

/** `tm3` → 'TM'; cualquier otra clave → null. */
function siglaDeGancho(clave: string): SiglaBloque | null {
  const m = /^(tg|tm|te)\d{1,2}$/.exec(clave);
  return m ? (m[1].toUpperCase() as SiglaBloque) : null;
}

/** Sigla TG/TM/TE como palabra: delimitada por no-letras Unicode (la Ñ y las tildes sí son letras) o borde. */
const RE_SIGLA = /(?<!\p{L})(TG|TM|TE)(?!\p{L})/giu;

/** Siglas TG/TM/TE presentes como palabra (delimitadas por no-letras o borde), en mayúsculas. */
export function siglasEnNombre(nombre: string): SiglaBloque[] {
  return [...nombre.matchAll(RE_SIGLA)].map((m) => m[1].toUpperCase() as SiglaBloque);
}

const MAX_VALOR_MENSAJE = 40;
const recortar = (t: string) => (t.length > MAX_VALOR_MENSAJE ? `${t.slice(0, MAX_VALOR_MENSAJE)}…` : t);

export interface AvisoBloqueo {
  titulo: string;
  detalle: string;
}

export const AVISO_SIN_TIPO: AvisoBloqueo = {
  titulo: 'No se pudo leer el archivo',
  detalle: 'No se pudo determinar el tipo de tienda de la versión; recarga la página.',
};

const TIPO_POR_SIGLA: Record<SiglaBloque, VersionTipo> = { TG: 'GRANDE', TM: 'MEDIANA', TE: 'EXPRESS' };

function nombreTamano(sigla: SiglaBloque): string {
  return `Tienda ${TIPO_TIENDA_META[TIPO_POR_SIGLA[sigla]].label.toLowerCase()}`;
}

/** Bloque ausente o vacío → aviso; en cualquier otro caso null. */
export function bloqueoDeLectura(lectura: LecturaExcelProductos): AvisoBloqueo | null {
  const { bloque, bloquesEnArchivo, errores, productos, columnasFaltantes } = lectura;
  if (bloquesEnArchivo.length > 0 && !bloquesEnArchivo.includes(bloque)) {
    return {
      titulo: 'No se importó nada',
      detalle: `El archivo no trae el bloque ${bloque} (${nombreTamano(bloque)}), que es el que corresponde a esta versión. Trae: ${bloquesEnArchivo.join(', ')}. Carga el archivo que incluya el bloque ${bloque}.`,
    };
  }
  if (bloquesEnArchivo.includes(bloque) && errores.length === 0 && productos.length === 0 && columnasFaltantes.length === 0) {
    return {
      titulo: 'No se importó nada',
      detalle: `El bloque ${bloque} (${nombreTamano(bloque)}) no tiene productos: todas sus filas están vacías o en 0. Verifica que el archivo tenga datos para esta versión.`,
    };
  }
  return null;
}

/** 0 → `A`, 25 → `Z`, 26 → `AA`, 27 → `AB`. */
export function letraColumna(indice: number): string {
  let letras = '';
  let n = indice + 1;
  while (n > 0) {
    const resto = (n - 1) % 26;
    letras = String.fromCharCode(65 + resto) + letras;
    n = Math.floor((n - 1) / 26);
  }
  return letras;
}

function texto(valor: Celda): string | null {
  if (valor === null || valor === undefined) return null;
  const t = String(valor).trim();
  return t ? t : null;
}

/**
 * Entero estricto ≥ 0: vacío → `null`; un número (o texto con solo dígitos) entero. Dos números,
 * texto, negativos o decimales son error; mayor que `maximo` también.
 */
function enteroCelda(valor: Celda, maximo?: number): ResultadoCelda<number | null> {
  const t = texto(valor);
  if (t === null) return bien(null);
  const rango = () => mal(
    `El valor ${t} está fuera del rango permitido (0 a ${maximo}).`,
    `Un número entero entre 1 y ${maximo}, por ejemplo: 4.`,
  );
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor) || valor < 0 || Math.abs(valor - Math.round(valor)) > 1e-9) {
      return mal(`El valor "${t}" no es un número válido.`, 'Un número entero mayor o igual a 0, por ejemplo: 10.');
    }
    const n = Math.round(valor);
    return maximo !== undefined && n > maximo ? rango() : bien(n);
  }
  const esDecimal = /^-?\d+[.,]\d+$/.test(t);
  if (!esDecimal && (t.includes('//') || (t.match(/\d+/g)?.length ?? 0) > 1)) {
    return mal(`La celda trae más de un número: "${t}".`, 'Un solo número entero, por ejemplo: 10.');
  }
  if (!/^\d+$/.test(t)) {
    return mal(`El valor "${t}" no es un número válido.`, 'Un número entero mayor o igual a 0, por ejemplo: 10.');
  }
  const n = Number(t);
  return maximo !== undefined && n > maximo ? rango() : bien(n);
}

const ESPERADO_GANCHO = 'Números de gancho enteros separados por coma, | o espacio; los de exhibición llevan E al final: 54, 65 | 54E.';

/**
 * Una celda de gancho puede traer varios ganchos separados por cualquier carácter que no sea
 * dígito ni letra (`132 | 146`, `168,169`, `166-167`). Un gancho es `54` (normal) o `54E`
 * (exhibición, también `54 E`). `0` se ignora; cualquier otro token es error.
 */
export function ganchosCelda(valor: Celda): ResultadoCelda<Gancho[]> {
  const t = texto(valor);
  if (t === null) return bien([]);
  const invalido = (token: string) => mal(`El gancho "${token}" no es válido.`, ESPERADO_GANCHO);
  if (typeof valor === 'number') {
    if (!Number.isInteger(valor) || valor < 0 || valor > MAX_GANCHO) return invalido(t);
    return bien(valor === 0 ? [] : [valor]);
  }
  // Un decimal o un negativo escrito como texto (`54.5`, `-3`) no se parte en otros ganchos: es error.
  const raro = /\d\.\d/.exec(t) ?? /^\s*-\s*\d+/.exec(t);
  if (raro) return invalido(raro.input.trim());
  const normalizado = t.toUpperCase().replace(/(\d)\s+E(?![A-Z])/g, '$1E');
  const ganchos: Gancho[] = [];
  for (const token of normalizado.split(/[^0-9A-Z]+/).filter(Boolean)) {
    if (/^0+E?$/.test(token)) continue;
    const gancho = leerGancho(token);
    if (gancho === null) return invalido(token);
    if (!ganchos.includes(gancho)) ganchos.push(gancho);
  }
  return bien(ganchos);
}

const SEPARADOR_ACCESORIOS = /\s*\/\/\s*/;
const TAMANO = /^(\d+(?:[.,]\d+)?)\s*(?:"|''|”|″|pulg(?:adas)?\.?|in\.?)?$/i;
const ESPERADO_TAMANO = 'Un número entre 1 y 999, con o sin comillas: 22 o 22". Para varios accesorios, sepáralos con //: 22" // 12".';

function validarTamano(pulgadas: number, literal: string): ResultadoCelda<number> {
  const redondeado = Math.round(pulgadas * 100) / 100;
  if (!(redondeado > 0) || redondeado > MAX_TAMANO_PULGADAS) {
    return mal(`El tamaño ${literal} está fuera del rango permitido (1 a 999).`, 'Un número entre 1 y 999 pulgadas: 22 o 22".');
  }
  return bien(redondeado);
}

function leerTamanos(valor: Celda): ResultadoCelda<number[]> {
  const t = texto(valor);
  if (t === null) return bien([]);
  if (typeof valor === 'number') {
    const r = validarTamano(valor, t);
    return r.ok ? bien([r.valor]) : r;
  }
  const tamanos: number[] = [];
  for (const segmento of t.split(SEPARADOR_ACCESORIOS).map((s) => s.trim()).filter(Boolean)) {
    const m = TAMANO.exec(segmento);
    if (!m) {
      const motivo = /\d/.test(segmento)
        ? `El tamaño "${segmento}" no es un número válido.`
        : `El tamaño "${segmento}" no contiene un número.`;
      return mal(motivo, ESPERADO_TAMANO);
    }
    const r = validarTamano(Number(m[1].replace(',', '.')), segmento);
    if (!r.ok) return r;
    tamanos.push(r.valor);
  }
  return bien(tamanos);
}

/**
 * Combina las celdas `Nombre_accesorio_*` y `Tamano_accesorio_*` (ambas separadas por `//`).
 * n nombres × m tamaños: n=0 → sin accesorios (el tamaño se ignora); n=1 → m accesorios del mismo
 * nombre (o uno sin tamaño); n≥2 con m=0 → todos sin tamaño; m=1 → todos con ese tamaño;
 * m=n → emparejados por posición; cualquier otra combinación es error.
 */
export function accesoriosDeCeldas(nombre: Celda, tamano: Celda): ResultadoAccesorios {
  const textoNombre = texto(nombre);
  const nombres = (textoNombre?.split(SEPARADOR_ACCESORIOS) ?? [])
    .map(normalizarCodigoAccesorio)
    .filter(Boolean);
  if (!nombres.length) return { ok: true, valor: [] };

  for (const n of nombres) {
    if (n.length > MAX_NOMBRE_ACCESORIO) {
      return {
        ok: false,
        campo: 'nombre_accesorio',
        motivo: `El accesorio "${n}" tiene ${n.length} caracteres y el máximo es ${MAX_NOMBRE_ACCESORIO}.`,
        esperado: 'Hasta 50 caracteres por accesorio; separa varios con //.',
      };
    }
  }

  const leidos = leerTamanos(tamano);
  if (!leidos.ok) return { ok: false, campo: 'tamano_accesorio', motivo: leidos.motivo, esperado: leidos.esperado };
  const tamanos = leidos.valor;

  const total = Math.max(nombres.length, tamanos.length);
  if (total > MAX_ACCESORIOS) {
    return {
      ok: false,
      campo: nombres.length >= tamanos.length ? 'nombre_accesorio' : 'tamano_accesorio',
      motivo: `La celda trae ${total} accesorios y el máximo es ${MAX_ACCESORIOS}.`,
      esperado: 'Hasta 10 accesorios por producto, separados con //. Si repites uno, usa su nombre una vez y un tamaño por cada unidad: "A" y "22" // 22".',
    };
  }

  if (nombres.length >= 2 && tamanos.length >= 2 && nombres.length !== tamanos.length) {
    return {
      ok: false,
      campo: 'tamano_accesorio',
      motivo: `Hay ${nombres.length} nombres de accesorio ("${nombres.join(' // ')}") y ${tamanos.length} tamaños ("${texto(tamano)}").`,
      esperado: 'Usa la misma cantidad separada por //, por ejemplo: nombre "A // B" y tamaño "22" // 12"". Si todos miden igual, escribe un solo tamaño: "22"".',
    };
  }

  const tamanoDe = (i: number): number | null => {
    if (!tamanos.length) return null;
    return tamanos.length === 1 ? tamanos[0] : tamanos[i];
  };
  const accesorios: AccesorioExcel[] = nombres.length === 1
    ? Array.from({ length: Math.max(1, tamanos.length) }, (_, i) => ({ codigo: nombres[0], tamano_pulgadas: tamanoDe(i) }))
    : nombres.map((codigo, i) => ({ codigo, tamano_pulgadas: tamanoDe(i) }));
  return { ok: true, valor: accesorios };
}

/** Agrupa accesorios iguales consecutivos (mismo código y tamaño) con su cantidad. */
export function agruparAccesorios(accesorios: AccesorioExcel[]): GrupoAccesorio[] {
  const grupos: GrupoAccesorio[] = [];
  for (const a of accesorios) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.codigo === a.codigo && ultimo.tamano_pulgadas === a.tamano_pulgadas) ultimo.cantidad += 1;
    else grupos.push({ ...a, cantidad: 1 });
  }
  return grupos;
}

/** Errores de los accesorios del archivo que no están en el catálogo (códigos normalizados). */
export function erroresDeCatalogo(origenes: OrigenAccesorio[], codigosCatalogo: Set<string>): ErrorLectura[] {
  return origenes
    .filter((o) => !codigosCatalogo.has(o.codigo))
    .map((o) => ({
      fila: o.fila,
      columna: o.columna,
      letra: o.letra,
      motivo: `El accesorio "${o.codigo}" no existe en el catálogo.`,
      esperado: 'Dalo de alta con el botón "Dar de alta" de la vista previa, o corrige el nombre en el archivo y vuelve a cargarlo.',
    }))
    .sort((a, b) => a.fila - b.fila);
}

/** El SKU puede venir como número en Excel: se lee sin decimales ni espacios. */
function sku(valor: Celda): string | null {
  if (typeof valor === 'number') return Number.isInteger(valor) ? String(valor) : null;
  return texto(valor)?.replace(/\s+/g, '') ?? null;
}

function modo(valor: Celda): Exclude<ModoPosicion, 'PENDIENTE'> | null {
  const t = normalizarEncabezado(valor);
  if (t.startsWith('planograma')) return 'PLANOGRAMA';
  if (t.startsWith('cross')) return 'CROSS';
  if (t.startsWith('impulso')) return 'IMPULSO';
  return null;
}

function decision(valor: Celda): DecisionPosicion | null {
  const t = texto(valor)?.toUpperCase();
  return t === 'ACTIVO' || t === 'INACTIVO' ? t : null;
}

function perfil(valor: Celda): PerfilRedondeo | null {
  const t = texto(valor)?.toUpperCase();
  return t === 'MRP' || t === 'ZSRE' ? t : null;
}

interface Columna {
  indice: number;
  nombre: string;
}

/**
 * Convierte las filas crudas de la hoja (primera hoja del libro) en productos a importar.
 * @param filas - filas de celdas tal cual las devuelve `readSheet`
 * @param tipo - tipo de la versión destino: decide qué bloque TG/TM/TE se lee
 */
export function interpretarHojaProductos(filas: Celda[][], tipo: VersionTipo): LecturaExcelProductos {
  const s = siglaBloque(tipo);
  const vacia: LecturaExcelProductos = {
    productos: [], planogramas: [], columnasFaltantes: [], errores: [], filasOmitidas: [], origenesAccesorio: [],
    bloque: s, bloquesEnArchivo: [],
  };
  const indiceEncabezado = filas
    .slice(0, FILAS_MAXIMAS_ENCABEZADO)
    .findIndex((fila) => fila.some((c) => normalizarEncabezado(c) === 'sku'));
  if (indiceEncabezado < 0) return { ...vacia, columnasFaltantes: ['SKU'] };

  const columnasComunes = new Map<Campo, Columna>();
  const columnasBloque = new Map<Campo, Columna>();
  const columnasGancho: Columna[] = [];
  const bloquesEnArchivo: SiglaBloque[] = [];
  const verBloque = (sigla: SiglaBloque | null) => {
    if (sigla && !bloquesEnArchivo.includes(sigla)) bloquesEnArchivo.push(sigla);
  };
  filas[indiceEncabezado].forEach((celda, indice) => {
    const clave = normalizarEncabezado(celda);
    const columna = { indice, nombre: String(celda ?? '').trim() };
    const siglaGancho = siglaDeGancho(clave);
    if (siglaGancho) {
      verBloque(siglaGancho);
      if (siglaGancho === s) columnasGancho.push(columna);
      return;
    }
    const { campo, sigla } = separarSufijo(clave);
    verBloque(sigla);
    if (!CAMPOS.includes(campo as Campo)) return;
    if (sigla === s && !columnasBloque.has(campo as Campo)) columnasBloque.set(campo as Campo, columna);
    else if (sigla === null && !columnasComunes.has(campo as Campo)) columnasComunes.set(campo as Campo, columna);
  });
  const columnas = new Map<Campo, Columna>([...columnasComunes, ...columnasBloque]);

  // Hay bloques en el archivo y falta el de la versión: no se lee nada (lo avisa `bloqueoDeLectura`).
  if (bloquesEnArchivo.length > 0 && !bloquesEnArchivo.includes(s)) return { ...vacia, bloquesEnArchivo };

  const columnasFaltantes = OBLIGATORIAS
    .filter((c) => !columnas.has(c))
    .map((c) => (c === 'sku' ? 'SKU' : `Facings_${s}`));
  if (columnasFaltantes.length) return { ...vacia, columnasFaltantes, bloquesEnArchivo };

  const valor = (fila: Celda[], campo: Campo): Celda => {
    const columna = columnas.get(campo);
    return columna === undefined ? null : fila[columna.indice];
  };

  const productos: ProductoExcel[] = [];
  const planogramas = new Set<string>();
  const errores: (ErrorLectura & { indice: number })[] = [];
  const filasOmitidas: LecturaExcelProductos['filasOmitidas'] = [];
  const origenesAccesorio: OrigenAccesorio[] = [];

  filas.slice(indiceEncabezado + 1).forEach((fila, i) => {
    const numeroFila = indiceEncabezado + i + 2;
    const codigo = sku(valor(fila, 'sku'));
    if (!codigo) {
      if (fila.some((c) => texto(c))) filasOmitidas.push({ fila: numeroFila, motivo: 'Sin SKU' });
      return;
    }

    const erroresFila: (ErrorLectura & { indice: number })[] = [];
    const registrar = (columna: Columna, r: { motivo: string; esperado: string }) => {
      erroresFila.push({
        fila: numeroFila, columna: columna.nombre, letra: letraColumna(columna.indice),
        motivo: r.motivo, esperado: r.esperado, indice: columna.indice,
      });
    };
    /** Lee una celda con su regla; si falla registra el error y devuelve `null`. */
    const leer = <T>(campo: Campo, regla: (v: Celda) => ResultadoCelda<T>): T | null => {
      const r = regla(valor(fila, campo));
      if (r.ok) return r.valor;
      registrar(columnas.get(campo) as Columna, r);
      return null;
    };
    const entero = (campo: Campo, maximo?: number) => leer(campo, (v) => enteroCelda(v, maximo));
    const textoLargo = (campo: Campo): string | null => {
      const t = texto(valor(fila, campo));
      if (t !== null && t.length > MAX_TEXTO) {
        registrar(columnas.get(campo) as Columna, {
          motivo: `El texto tiene ${t.length} caracteres y el máximo es ${MAX_TEXTO}.`,
          esperado: 'Hasta 500 caracteres.',
        });
        return null;
      }
      return t;
    };

    if (codigo.length > MAX_SKU) {
      registrar(columnas.get('sku') as Columna, {
        motivo: `El SKU "${codigo}" tiene más de ${MAX_SKU} caracteres.`,
        esperado: 'El código del SKU, hasta 50 caracteres.',
      });
    }

    const ganchos: Gancho[] = [];
    for (const columna of columnasGancho) {
      const r = ganchosCelda(fila[columna.indice]);
      if (!r.ok) registrar(columna, r);
      else r.valor.forEach((g) => { if (!ganchos.includes(g)) ganchos.push(g); });
    }

    const facingsLeidos = entero('facings', MAX_FACINGS);
    const normales = ganchos.filter((g) => !esGanchoExhibicion(g)).length;
    const facingsVacio = texto(valor(fila, 'facings')) === null;
    if (facingsVacio && ganchos.length > 0 && normales === 0) {
      registrar(columnas.get('facings') as Columna, {
        motivo: `Facings está vacío y la fila solo tiene ganchos de exhibición (${ganchos.map(textoGancho).join(', ')}); esos ganchos no cuentan como facings.`,
        esperado: 'Escribe la cantidad de facings, por ejemplo: 2.',
      });
    }
    // Facings vacío: tantos como ganchos normales; los de exhibición (E) no cuentan.
    const facings = facingsVacio ? (normales || null) : facingsLeidos;

    const unidades = entero('cantidad_x_facing');
    const apilable = entero('cantidad_facing_vertical');
    const minEstetico = entero('min_estetico');
    const capacidad = entero('capacidad_maxima');
    const minFinal = entero('min_final');
    const maxFinal = entero('max_final');
    const descripcion = textoLargo('descripcion');
    const observaciones = textoLargo('observaciones');

    let accesorios: AccesorioExcel[] = [];
    const columnaNombre = columnas.get('nombre_accesorio');
    const columnaTamano = columnas.get('tamano_accesorio');
    const resultadoAccesorios = accesoriosDeCeldas(valor(fila, 'nombre_accesorio'), valor(fila, 'tamano_accesorio'));
    if (resultadoAccesorios.ok) accesorios = resultadoAccesorios.valor;
    else registrar((resultadoAccesorios.campo === 'nombre_accesorio' ? columnaNombre : columnaTamano) as Columna, resultadoAccesorios);

    // Solo filas que serían producto: un bloque en 0 con el nombre copiado de otro tamaño es "bloque vacío".
    const columnaPlanograma = columnas.get('planograma');
    if (facings && facings >= 1 && columnaPlanograma) {
      const nombrePlano = texto(valor(fila, 'planograma'));
      const siglas = nombrePlano ? siglasEnNombre(nombrePlano) : [];
      if (nombrePlano && siglas.length && !siglas.includes(s)) {
        const ejemplo = nombrePlano.replace(RE_SIGLA, s);
        registrar(columnaPlanograma, {
          motivo: `El nombre «${recortar(nombrePlano)}» no corresponde al bloque ${s}`,
          esperado: `Un nombre de planograma de ${nombreTamano(s).toLowerCase()} (${s}), p. ej. «${recortar(ejemplo)}»`,
        });
      }
    }

    errores.push(...erroresFila);
    if (erroresFila.length) return;

    if (!facings || facings < 1) {
      filasOmitidas.push({ fila: numeroFila, motivo: `SKU ${codigo}: sin facings` });
      return;
    }

    const planograma = texto(valor(fila, 'planograma'));
    if (planograma) planogramas.add(planograma);

    if (columnaNombre) {
      for (const c of new Set(accesorios.map((a) => a.codigo))) {
        origenesAccesorio.push({ fila: numeroFila, columna: columnaNombre.nombre, letra: letraColumna(columnaNombre.indice), codigo: c });
      }
    }

    productos.push({
      sku: codigo,
      descripcion,
      ganchos,
      facings_horizontal: facings,
      unidades_por_facing: unidades || 1,
      cantidad_apilable: apilable || 1,
      min_estetico: minEstetico,
      capacidad_maxima: capacidad || null,
      min_final: minFinal,
      max_final: maxFinal,
      perfil_redondeo: perfil(valor(fila, 'perfil_redondeo')),
      modo: modo(valor(fila, 'modo')),
      decision: decision(valor(fila, 'decision_final')),
      accesorios,
      observaciones,
    });
  });

  if (errores.length) {
    errores.sort((a, b) => a.fila - b.fila || a.indice - b.indice);
    return {
      productos: [],
      planogramas: [...planogramas],
      columnasFaltantes: [],
      errores: errores.map(({ indice: _indice, ...e }) => e),
      filasOmitidas,
      origenesAccesorio: [],
      bloque: s,
      bloquesEnArchivo,
    };
  }

  return { productos, planogramas: [...planogramas], columnasFaltantes: [], errores: [], filasOmitidas, origenesAccesorio, bloque: s, bloquesEnArchivo };
}

/** Lee la primera hoja del archivo. La librería se carga solo cuando se usa. */
export async function leerExcelProductos(archivo: File, tipo: VersionTipo): Promise<LecturaExcelProductos> {
  const { readSheet } = await import('read-excel-file/browser');
  const filas = (await readSheet(archivo)) as Celda[][];
  return interpretarHojaProductos(filas, tipo);
}
