/** Lectura del Excel de productos de un planograma (una fila por SKU con sus ganchos, cantidades,
 * mín./máx. y accesorio de montaje) al formato de POST /versiones/:id/importar-productos.
 *
 * Los encabezados se reconocen sin importar mayúsculas, tildes ni el sufijo del tipo de tienda
 * (`Facings_TG`, `Facings_TM`...): las columnas de gancho son `TG1`, `TG2`... (prefijo de 2 letras
 * + número). Se ignoran las columnas que no se guardan (jerarquía, marca, modelo, temporada,
 * fecha, sustitución y su justificación, planograma — este último solo se usa para avisar si el archivo es de otro planograma). */

import type { DecisionPosicion, ModoPosicion, PerfilRedondeo } from '../types/posicion';
import type { ProductoExcel } from '../types/importacionProductos';

/** Fila de encabezados: la primera, dentro de las primeras filas, que tenga una columna "SKU". */
const FILAS_MAXIMAS_ENCABEZADO = 15;

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

export interface LecturaExcelProductos {
  productos: ProductoExcel[];
  /** Valores de la columna Planograma_XX (ej. "PINTURAS TG-10"), para avisar si no es la versión. */
  planogramas: string[];
  columnasFaltantes: string[];
  /** Filas con datos que no se pudieron leer (número de fila del Excel → motivo). */
  filasConError: { fila: number; motivo: string }[];
}

function normalizarEncabezado(texto: Celda): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** `facings_tg` → `facings`; `tg1` se deja (es columna de gancho). */
function sinSufijoTipo(clave: string): string {
  const partes = clave.split('_');
  return partes.length > 1 && /^t[a-z]$/.test(partes[partes.length - 1]) ? partes.slice(0, -1).join('_') : clave;
}

const esColumnaGancho = (clave: string) => /^t[a-z]\d{1,2}$/.test(clave);

function texto(valor: Celda): string | null {
  if (valor === null || valor === undefined) return null;
  const t = String(valor).trim();
  return t ? t : null;
}

function numero(valor: Celda): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  const t = texto(valor);
  if (!t) return null;
  const n = Number(t.replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(n) && t.match(/\d/) ? n : null;
}

const entero = (valor: Celda) => {
  const n = numero(valor);
  return n === null ? null : Math.round(n);
};

/**
 * Una celda de gancho puede traer varios números separados por `,` `|` `/` `-` o espacio
 * (ej. `132 | 146`, `168,169`, `166-167`): cualquier carácter que no sea dígito separa.
 */
function numerosGancho(valor: Celda): number[] {
  if (typeof valor === 'number') return Number.isFinite(valor) ? [Math.round(valor)] : [];
  return (texto(valor)?.match(/\d+/g) ?? []).map(Number);
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

/**
 * Convierte las filas crudas de la hoja (primera hoja del libro) en productos a importar.
 * @param filas - filas de celdas tal cual las devuelve `readSheet`
 */
export function interpretarHojaProductos(filas: Celda[][]): LecturaExcelProductos {
  const indiceEncabezado = filas
    .slice(0, FILAS_MAXIMAS_ENCABEZADO)
    .findIndex((fila) => fila.some((c) => normalizarEncabezado(c) === 'sku'));
  if (indiceEncabezado < 0) {
    return { productos: [], planogramas: [], columnasFaltantes: ['SKU'], filasConError: [] };
  }

  const columnas = new Map<Campo, number>();
  const columnasGancho: number[] = [];
  filas[indiceEncabezado].forEach((celda, i) => {
    const clave = normalizarEncabezado(celda);
    if (esColumnaGancho(clave)) {
      columnasGancho.push(i);
      return;
    }
    const campo = sinSufijoTipo(clave) as Campo;
    if (CAMPOS.includes(campo) && !columnas.has(campo)) columnas.set(campo, i);
  });

  const columnasFaltantes = OBLIGATORIAS.filter((c) => !columnas.has(c));
  if (columnasFaltantes.length) return { productos: [], planogramas: [], columnasFaltantes, filasConError: [] };

  const valor = (fila: Celda[], campo: Campo): Celda => {
    const i = columnas.get(campo);
    return i === undefined ? null : fila[i];
  };

  const productos: ProductoExcel[] = [];
  const planogramas = new Set<string>();
  const filasConError: LecturaExcelProductos['filasConError'] = [];

  filas.slice(indiceEncabezado + 1).forEach((fila, i) => {
    const numeroFila = indiceEncabezado + i + 2;
    const codigo = sku(valor(fila, 'sku'));
    if (!codigo) {
      if (fila.some((c) => texto(c))) filasConError.push({ fila: numeroFila, motivo: 'Sin SKU' });
      return;
    }

    const ganchos = [...new Set(columnasGancho.flatMap((c) => numerosGancho(fila[c])).filter((n) => n > 0))];
    const facings = entero(valor(fila, 'facings')) ?? (ganchos.length || null);
    if (!facings || facings < 1) {
      filasConError.push({ fila: numeroFila, motivo: `SKU ${codigo}: sin facings` });
      return;
    }

    const planograma = texto(valor(fila, 'planograma'));
    if (planograma) planogramas.add(planograma);

    productos.push({
      sku: codigo,
      descripcion: texto(valor(fila, 'descripcion')),
      ganchos,
      facings_horizontal: facings,
      unidades_por_facing: entero(valor(fila, 'cantidad_x_facing')) || 1,
      cantidad_apilable: entero(valor(fila, 'cantidad_facing_vertical')) || 1,
      min_estetico: entero(valor(fila, 'min_estetico')),
      capacidad_maxima: entero(valor(fila, 'capacidad_maxima')) || null,
      min_final: entero(valor(fila, 'min_final')),
      max_final: entero(valor(fila, 'max_final')),
      perfil_redondeo: perfil(valor(fila, 'perfil_redondeo')),
      modo: modo(valor(fila, 'modo')),
      decision: decision(valor(fila, 'decision_final')),
      accesorio_codigo: texto(valor(fila, 'nombre_accesorio'))?.toUpperCase() ?? null,
      tamano_accesorio_pulgadas: numero(valor(fila, 'tamano_accesorio')),
      observaciones: texto(valor(fila, 'observaciones')),
    });
  });

  return { productos, planogramas: [...planogramas], columnasFaltantes: [], filasConError };
}

/** Lee la primera hoja del archivo. La librería se carga solo cuando se usa. */
export async function leerExcelProductos(archivo: File): Promise<LecturaExcelProductos> {
  const { readSheet } = await import('read-excel-file/browser');
  const filas = (await readSheet(archivo)) as Celda[][];
  return interpretarHojaProductos(filas);
}
