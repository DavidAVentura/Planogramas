// Columnas del Consolidado Tiendas: catálogo, texto de cada celda y preferencias (orden/visibilidad).
// Lógica pura, sin React. El back duplica la lista de claves y las etiquetas para el Excel (DT-43):
// ambas pruebas comparan el mismo literal de 24 claves.
import { DECISION_POSICION_META } from '../../constants/implementacion';
import { MODO_APARICION_META } from '../../constants/productos';
import { TIPO_TIENDA_META } from '../../constants/tiendas';
import type { FilaConsolidado, GrupoConsolidado, OrdenConsolidado } from '../../types/consolidado';
import type { Gancho } from '../../types/gancho';
import type { DecisionPosicion } from '../../types/posicion';
import {
  validarOrdenVisibilidad,
  type PreferenciasOrdenVisibilidad,
} from '../columnas/preferenciasColumnas';

export const CLAVES_COLUMNA_CONSOLIDADO = [
  'sku',
  'producto',
  'tienda',
  'version',
  'estadoVersion',
  'seccion',
  'gondola',
  'nivel',
  'orden',
  'ganchos',
  'accesorio',
  'montaje',
  'facings',
  'apilable',
  'capacidadFacing',
  'capacidadMaxima',
  'minEstetico',
  'minFinal',
  'maxFinal',
  'perfil',
  'modo',
  'decision',
  'observaciones',
  'sustituto',
] as const;

export type ClaveColumnaConsolidado = (typeof CLAVES_COLUMNA_CONSOLIDADO)[number];
export type PreferenciasConsolidado = PreferenciasOrdenVisibilidad<ClaveColumnaConsolidado>;

export const TEXTO_VARIA = 'Varía';

export interface ColumnaConsolidado {
  clave: ClaveColumnaConsolidado;
  etiqueta: string;
  /** Ancho mínimo en px; la última columna visible se estira si sobra espacio. */
  ancho: number;
  /** Se alinea a la derecha. */
  numerica: boolean;
  /** Criterio de orden del servidor; `null` si la columna no se puede ordenar. */
  ordenable: OrdenConsolidado | null;
}

const col = (
  clave: ClaveColumnaConsolidado,
  etiqueta: string,
  ancho: number,
  numerica = false,
  ordenable: OrdenConsolidado | null = null,
): ColumnaConsolidado => ({ clave, etiqueta, ancho, numerica, ordenable });

export const COLUMNAS_CONSOLIDADO: readonly ColumnaConsolidado[] = [
  col('sku', 'SKU', 104, false, 'sku'),
  col('producto', 'Producto', 250, false, 'producto'),
  col('tienda', 'Tienda', 200, false, 'tienda'),
  col('version', 'Planograma versión', 200, false, 'version'),
  col('estadoVersion', 'Estado de la versión', 140),
  col('seccion', 'Sección', 84, true),
  col('gondola', 'Góndola', 150),
  col('nivel', 'Nivel', 88, true),
  col('orden', 'Posición en nivel', 104, true),
  col('ganchos', 'Ganchos', 130),
  col('accesorio', 'Accesorio de montaje', 170),
  col('montaje', 'Montaje', 230),
  col('facings', 'Facing horizontal', 110, true),
  col('apilable', 'Cantidad apilable', 110, true),
  col('capacidadFacing', 'Capacidad del facing', 118, true),
  col('capacidadMaxima', 'Capacidad máxima', 116, true),
  col('minEstetico', 'Mín. estético', 104, true),
  col('minFinal', 'Mín. final', 96, true),
  col('maxFinal', 'Máx. final', 96, true),
  col('perfil', 'Perfil de redondeo', 130),
  col('modo', 'Modo', 120),
  col('decision', 'Decisión', 110),
  col('observaciones', 'Observaciones', 260),
  col('sustituto', 'SKU sustituto', 210),
];

const POR_CLAVE = new Map(COLUMNAS_CONSOLIDADO.map((c) => [c.clave, c]));

export function columnaConsolidado(clave: ClaveColumnaConsolidado): ColumnaConsolidado {
  return POR_CLAVE.get(clave)!;
}

export function esClaveColumnaConsolidado(valor: unknown): valor is ClaveColumnaConsolidado {
  return typeof valor === 'string' && POR_CLAVE.has(valor as ClaveColumnaConsolidado);
}

// ─── Preferencias ────────────────────────────────────────────────────────────

const VISIBLES_POR_DEFECTO: readonly ClaveColumnaConsolidado[] = [
  'sku', 'producto', 'tienda', 'version', 'estadoVersion', 'gondola', 'nivel', 'montaje', 'minFinal', 'maxFinal',
];

export const OCULTAS_INICIALES: readonly ClaveColumnaConsolidado[] = CLAVES_COLUMNA_CONSOLIDADO.filter(
  (c) => !VISIBLES_POR_DEFECTO.includes(c),
);

export const PREFERENCIAS_CONSOLIDADO_INICIALES: PreferenciasConsolidado = {
  orden: [...CLAVES_COLUMNA_CONSOLIDADO],
  ocultas: [...OCULTAS_INICIALES],
};

/** Valida lo leído de localStorage: una clave ajena (o `__proto__`) nunca llega a la tabla ni al servidor. */
export function validarPreferenciasConsolidado(crudo: unknown): PreferenciasConsolidado {
  return validarOrdenVisibilidad(crudo, CLAVES_COLUMNA_CONSOLIDADO, OCULTAS_INICIALES);
}

// ─── Texto de las celdas ─────────────────────────────────────────────────────

export interface TextoCelda {
  principal: string;
  secundario?: string;
}

const unir = (partes: (string | null | undefined)[], separador: string) =>
  partes.filter((p): p is string => !!p).join(separador);

/** `5` → `05`; los ganchos de exhibición ("54E") van tal cual, igual que en el Excel. */
const textoGanchoConsolidado = (g: Gancho) => (typeof g === 'number' ? String(g).padStart(2, '0') : g);

const numero = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? String(v) : '');

/** `codigo (12")`, o solo el código si no hay tamaño; unidos con coma. */
export function textoAccesorios(fila: FilaConsolidado | null): string {
  if (!fila) return '';
  return fila.accesorios
    .map((a) => (a.tamanoPulgadas === null ? a.codigo : `${a.codigo} (${a.tamanoPulgadas}")`))
    .join(', ');
}

/** Banderas de montaje de la fila, en el orden de la tabla y el Excel. */
export function banderasMontaje(fila: FilaConsolidado | null): string[] {
  if (!fila) return [];
  const m = fila.montaje;
  return [
    ...(m.colganteExterno ? ['Colgante externo'] : []),
    ...(m.display ? ['Display'] : []),
    ...(m.desborda ? [`Desborda la góndola${m.notaDesborde ? `: ${m.notaDesborde}` : ''}`] : []),
  ];
}

const ETIQUETA_ESTADO: Record<string, string> = { publicado: 'Publicada', piloto: 'Piloto' };

function etiquetaDecision(decision: string | null): string {
  if (!decision) return '';
  return DECISION_POSICION_META[decision as DecisionPosicion]?.label ?? decision;
}

/**
 * Texto de una celda: el mismo de la descarga a Excel (reglas de "Celdas" del contrato). `fila` es
 * `null` en el grupo sin planograma: las columnas de fila quedan vacías. `secundario` es la línea
 * gris de la tabla (marca, planograma, tipo de tienda, N ubicaciones).
 */
export function textoCelda(clave: ClaveColumnaConsolidado, fila: FilaConsolidado | null, grupo: GrupoConsolidado): TextoCelda {
  switch (clave) {
    case 'sku':
      return { principal: grupo.sku };
    case 'producto':
      return { principal: grupo.producto.nombre ?? '', secundario: grupo.producto.marca ?? undefined };
    case 'tienda':
      return { principal: unir([grupo.tienda.codigo, grupo.tienda.nombre], ' · '), secundario: TIPO_TIENDA_META[grupo.tienda.tipo].label };
    case 'sustituto':
      return { principal: unir([grupo.producto.skuSustituto, grupo.producto.nombreSustituto], ' · ') };
  }
  if (!fila) return { principal: '' };

  switch (clave) {
    case 'version':
      return { principal: fila.codigoVersion, secundario: fila.planogramaNombre };
    case 'estadoVersion':
      return { principal: ETIQUETA_ESTADO[fila.estadoVersion] ?? fila.estadoVersion };
    case 'seccion':
      return { principal: unir(fila.ubicaciones.map((u) => (u.seccion === null ? null : String(u.seccion))), ', ') };
    case 'gondola': {
      const nombres = [...new Set(fila.ubicaciones.map((u) => u.gondola))];
      const n = fila.ubicaciones.length;
      return { principal: nombres.join(', '), secundario: n > 1 ? `${n} ubicaciones` : undefined };
    }
    case 'nivel':
      return { principal: unir(fila.ubicaciones.map((u) => String(u.nivel)), ', ') };
    case 'orden':
      return { principal: unir(fila.ubicaciones.map((u) => String(u.orden)), ', ') };
    case 'ganchos':
      return { principal: unir(fila.ubicaciones.flatMap((u) => u.ganchos.map(textoGanchoConsolidado)), ', ') };
    case 'accesorio':
      return { principal: textoAccesorios(fila) };
    case 'montaje':
      return { principal: unir([textoAccesorios(fila), ...banderasMontaje(fila)], ', ') };
    case 'facings':
      return { principal: numero(fila.facings) };
    case 'apilable':
      return { principal: numero(fila.cantidadApilable) };
    case 'capacidadFacing':
      return { principal: numero(fila.capacidadFacing) };
    case 'capacidadMaxima':
      return { principal: numero(fila.capacidadMaxima) };
    case 'minEstetico':
      return { principal: numero(fila.minEstetico) };
    case 'minFinal':
      return { principal: fila.minVaria ? TEXTO_VARIA : numero(fila.minFinal) };
    case 'maxFinal':
      return { principal: fila.maxVaria ? TEXTO_VARIA : numero(fila.maxFinal) };
    case 'perfil':
      return { principal: fila.perfil ?? '' };
    case 'modo':
      return { principal: MODO_APARICION_META[fila.modo].label };
    case 'decision':
      return { principal: etiquetaDecision(fila.decision) };
    case 'observaciones':
      return { principal: fila.observaciones ?? '' };
  }
}
