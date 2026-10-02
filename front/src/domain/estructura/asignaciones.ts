/**
 * Reglas de la matriz de Estructura (qué versión de cada planograma monta cada tienda), sin React.
 *
 * Una tienda monta UNA sola versión por planograma: publicada (TG/TM/TE o su especial) o en
 * piloto. El valor de cada celda se guarda como string para poder compararlo y copiarlo barato:
 *   ''          → sin asignar
 *   'v{id}'     → monta la versión {id}
 *   'n{baseId}' → especial nueva, se clona publicada desde la base {baseId} al guardar
 */
import { SIGLA_TIPO_TIENDA } from '../../constants/tiendas';
import type {
  AccionAsignacion,
  AsignacionMatriz,
  CambioAsignacion,
  OrigenEdicion,
  PlanogramaMatriz,
  TiendaMatriz,
  VersionAuditada,
  VersionMatriz,
} from '../../types/asignacion';
import type { VersionTipo } from '../../types/version';

export type ValorCelda = string;
export type Pincel = 'TG' | 'TM' | 'TE' | 'ESP' | 'QUITAR';
export type MapaAsignaciones = Record<string, ValorCelda>;

const TIPO_POR_SIGLA: Record<'TG' | 'TM' | 'TE', VersionTipo> = { TG: 'GRANDE', TM: 'MEDIANA', TE: 'EXPRESS' };
const ORDEN_TIPOS: VersionTipo[] = ['GRANDE', 'MEDIANA', 'EXPRESS'];

export const ESTADO_LEGIBLE: Record<string, string> = {
  borrador: 'borrador',
  en_desarrollo: 'desarrollo',
  piloto: 'piloto',
  publicado: 'publicada',
  archivado: 'archivada',
};

export function clave(planogramaId: number, tiendaId: number): string {
  return `${planogramaId}|${tiendaId}`;
}

export function valorDeVersion(versionId: number): ValorCelda {
  return `v${versionId}`;
}

function idDeValor(valor: ValorCelda): number {
  return Number(valor.slice(1));
}

/** Estado inicial de la matriz. Si una celda tuviera dos versiones (datos previos a la regla),
 * gana la piloto: es la que la tienda tiene montada más recientemente. */
export function mapaInicial(asignaciones: AsignacionMatriz[], versiones: Map<number, VersionMatriz>): MapaAsignaciones {
  const mapa: MapaAsignaciones = {};
  for (const a of asignaciones) {
    const k = clave(a.planogramaId, a.tiendaId);
    const previa = mapa[k] ? versiones.get(idDeValor(mapa[k])) : undefined;
    if (!previa || versiones.get(a.versionId)?.estado === 'piloto') mapa[k] = valorDeVersion(a.versionId);
  }
  return mapa;
}

export function indexarVersiones(planogramas: PlanogramaMatriz[]): Map<number, VersionMatriz> {
  return new Map(planogramas.flatMap((p) => p.versiones.map((v) => [v.id, v] as const)));
}

function lineaBase(p: PlanogramaMatriz, tipo: VersionTipo, estado: 'publicado' | 'piloto') {
  return p.versiones.find((v) => v.versionBaseId === null && v.tipo === tipo && v.estado === estado);
}

function especialesDe(p: PlanogramaMatriz, tiendaId: number) {
  return p.versiones.filter((v) => v.versionBaseId !== null && v.tiendaEspecialId === tiendaId);
}

/** Base desde la que se clona una especial nueva: la publicada del tipo de la tienda o, si no hay,
 * la primera publicada por tamaño. */
function baseParaEspecial(p: PlanogramaMatriz, t: TiendaMatriz) {
  return lineaBase(p, t.tipo, 'publicado') ?? ORDEN_TIPOS.map((tipo) => lineaBase(p, tipo, 'publicado')).find(Boolean);
}

export type ResultadoPincel = { valor: ValorCelda } | { bloqueo: string };

/** Qué valor deja el pincel en la celda, o por qué no se puede aplicar. */
export function resolverPincel(pincel: Pincel, modoPiloto: boolean, p: PlanogramaMatriz, t: TiendaMatriz): ResultadoPincel {
  if (pincel === 'QUITAR') return { valor: '' };
  const estado = modoPiloto ? 'piloto' : 'publicado';

  if (pincel !== 'ESP') {
    const version = lineaBase(p, TIPO_POR_SIGLA[pincel], estado);
    if (version) return { valor: valorDeVersion(version.id) };
    return { bloqueo: `${p.nombre} no tiene versión ${pincel} ${modoPiloto ? 'en piloto' : 'publicada'}` };
  }

  const especiales = especialesDe(p, t.id);
  const montable = especiales.find((v) => v.estado === estado);
  if (montable) return { valor: valorDeVersion(montable.id) };
  if (modoPiloto) return { bloqueo: `${t.codigo} no tiene una especial de ${p.nombre} en piloto` };

  const enProceso = especiales.find((v) => v.estado !== 'archivado');
  if (enProceso) {
    return { bloqueo: `${t.codigo} ya tiene una especial en ${ESTADO_LEGIBLE[enProceso.estado]} (${enProceso.codigo}); publícala desde el planograma` };
  }
  const base = baseParaEspecial(p, t);
  if (!base) return { bloqueo: `${p.nombre} no tiene versiones publicadas de las que derivar una especial` };
  return { valor: `n${base.id}` };
}

// ─── Promover a piloto desde Estructura ──────────────────────────────────────
// La versión está en desarrollo: no es montable todavía, así que la matriz la muestra como piloto
// (vista previa) y al guardar se llama a POST /versiones/:id/promover con las tiendas elegidas.

/** Sigla del pincel que corresponde a una versión: TG/TM/TE, o Especial si es por tienda. */
export function pincelDeVersion(v: VersionMatriz): Pincel {
  return v.versionBaseId !== null ? 'ESP' : (SIGLA_TIPO_TIENDA[v.tipo] as Pincel);
}

/** Planogramas con la versión que se promueve marcada como piloto, para verla así en la matriz. */
export function conVistaPreviaPiloto(planogramas: PlanogramaMatriz[], versionId: number): PlanogramaMatriz[] {
  return planogramas.map((p) =>
    p.versiones.some((v) => v.id === versionId)
      ? { ...p, versiones: p.versiones.map((v) => (v.id === versionId ? { ...v, estado: 'piloto' as const } : v)) }
      : p,
  );
}

/** Pincel durante una promoción: solo se pinta la versión que se promueve, en su planograma;
 * "Quitar" devuelve la celda a lo que tenía guardado. */
export function resolverPromocion(
  pincel: Pincel,
  version: VersionMatriz,
  planogramaId: number,
  guardadas: MapaAsignaciones,
  p: PlanogramaMatriz,
  t: TiendaMatriz,
): ResultadoPincel {
  if (p.id !== planogramaId) return { bloqueo: `Durante la promoción solo se asignan tiendas a ${version.codigo}` };
  if (pincel === 'QUITAR') return { valor: guardadas[clave(p.id, t.id)] ?? '' };
  if (version.versionBaseId !== null && version.tiendaEspecialId !== null && version.tiendaEspecialId !== t.id) {
    return { bloqueo: `${version.codigo} es una versión especial de otra tienda` };
  }
  return { valor: valorDeVersion(version.id) };
}

/** Piloto de línea base del mismo tipo que se archivaría al promover `version` (no aplica a especiales). */
export function pilotoQueSeArchiva(p: PlanogramaMatriz, version: VersionMatriz): VersionMatriz | undefined {
  if (version.versionBaseId !== null) return undefined;
  return p.versiones.find((v) => v.id !== version.id && v.versionBaseId === null && v.tipo === version.tipo && v.estado === 'piloto');
}

/** Tiendas que en `mapa` montan la versión (celdas con su valor). */
export function tiendasConVersion(mapa: MapaAsignaciones, planogramaId: number, versionId: number): number[] {
  const valor = valorDeVersion(versionId);
  return Object.entries(mapa)
    .filter(([k, v]) => v === valor && k.startsWith(`${planogramaId}|`))
    .map(([k]) => Number(k.split('|')[1]));
}

export interface DescripcionCelda {
  vacia: boolean;
  /** 'TG' | 'TM' | 'TE' | 'Especial' */
  etiqueta: string;
  esPiloto: boolean;
  esEspecial: boolean;
  /** Especial que se crea al guardar. */
  esNueva: boolean;
  /** Versión montada (o la base de la especial nueva). */
  version: VersionMatriz | null;
  /** Versión de otro tamaño que el de la tienda (no aplica a especiales). */
  distinta: boolean;
}

const CELDA_VACIA: DescripcionCelda = {
  vacia: true, etiqueta: 'Sin asignar', esPiloto: false, esEspecial: false, esNueva: false, version: null, distinta: false,
};

export function describirCelda(valor: ValorCelda | undefined, t: TiendaMatriz, versiones: Map<number, VersionMatriz>): DescripcionCelda {
  if (!valor) return CELDA_VACIA;
  const version = versiones.get(idDeValor(valor)) ?? null;
  if (!version) return CELDA_VACIA;
  const esNueva = valor.startsWith('n');
  const esEspecial = esNueva || version.versionBaseId !== null;
  return {
    vacia: false,
    etiqueta: esEspecial ? 'Especial' : SIGLA_TIPO_TIENDA[version.tipo],
    esPiloto: !esNueva && version.estado === 'piloto',
    esEspecial,
    esNueva,
    version,
    distinta: !esEspecial && version.tipo !== t.tipo,
  };
}

/** Texto corto de una celda para chips y el historial: "TG", "Piloto TM", "Especial T0PC"… */
export function textoCelda(d: DescripcionCelda, t: TiendaMatriz): string {
  if (d.vacia) return 'Sin asignar';
  if (d.esNueva) return `Especial · copia de ${SIGLA_TIPO_TIENDA[d.version!.tipo]}`;
  const base = d.esEspecial ? `Especial ${t.codigo}` : d.etiqueta;
  return d.esPiloto ? `Piloto ${base}` : base;
}

export function aCambioApi(k: string, valor: ValorCelda): CambioAsignacion {
  const [planogramaId, tiendaId] = k.split('|').map(Number);
  if (!valor) return { planogramaId, tiendaId, versionId: null };
  if (valor.startsWith('n')) return { planogramaId, tiendaId, crearEspecialDesde: idDeValor(valor) };
  return { planogramaId, tiendaId, versionId: idDeValor(valor) };
}

export function clavesCambiadas(actual: MapaAsignaciones, guardado: MapaAsignaciones): string[] {
  const claves = new Set([...Object.keys(actual), ...Object.keys(guardado)]);
  return [...claves].filter((k) => (actual[k] ?? '') !== (guardado[k] ?? ''));
}

// ─── Resumen antes de guardar ────────────────────────────────────────────────

export type GrupoCambio = 'QUITA' | 'PILOTO_ENTRA' | 'PILOTO_SALE' | 'CAMBIO' | 'ESP_NUEVA' | 'NUEVA';

export const GRUPOS_CAMBIO: { id: GrupoCambio; titulo: string; corto: string; implicacion: string }[] = [
  {
    id: 'QUITA', titulo: 'Tiendas que dejan de usar el planograma', corto: 'dejan de usarlo',
    implicacion: 'Los implementadores de estas tiendas ya no verán el planograma. No se borra ninguna versión: puedes volver a asignarla después.',
  },
  {
    id: 'PILOTO_ENTRA', titulo: 'Tiendas que montan una versión piloto', corto: 'montan piloto',
    implicacion: 'La tienda desmonta la versión que tiene y monta la piloto para probarla. El resto de tiendas sigue con su versión publicada.',
  },
  {
    id: 'PILOTO_SALE', titulo: 'Tiendas que dejan la versión piloto', corto: 'dejan el piloto',
    implicacion: 'La tienda desmonta la versión piloto y vuelve a montar una versión publicada.',
  },
  {
    id: 'CAMBIO', titulo: 'Cambios de versión', corto: 'cambian de versión',
    implicacion: 'La tienda deja de ver la versión anterior y pasa a la nueva, así que el montaje en piso debe actualizarse.',
  },
  {
    id: 'ESP_NUEVA', titulo: 'Versiones especiales que se crearán', corto: 'especiales nuevas',
    implicacion: 'Se crea una copia publicada de la versión base indicada, exclusiva de esa tienda, y la tienda pasa a usarla. Será idéntica a la base hasta que la edites.',
  },
  {
    id: 'NUEVA', titulo: 'Asignaciones nuevas', corto: 'asignaciones nuevas',
    implicacion: 'Los implementadores de estas tiendas empezarán a ver el planograma en su tienda.',
  },
];

export function grupoDeCambio(antes: DescripcionCelda, despues: DescripcionCelda): GrupoCambio {
  if (despues.vacia) return 'QUITA';
  if (despues.esNueva) return 'ESP_NUEVA';
  if (despues.esPiloto) return 'PILOTO_ENTRA';
  if (antes.esPiloto) return 'PILOTO_SALE';
  return antes.vacia ? 'NUEVA' : 'CAMBIO';
}

// ─── Chips, historial y ediciones ────────────────────────────────────────────

export type VarianteChip = 'tg' | 'tm' | 'te' | 'esp' | 'piloto' | 'vacia';

export function varianteDeCelda(d: DescripcionCelda): VarianteChip {
  if (d.vacia) return 'vacia';
  if (d.esPiloto) return 'piloto';
  if (d.esEspecial) return 'esp';
  return SIGLA_TIPO_TIENDA[d.version!.tipo].toLowerCase() as VarianteChip;
}

/** Chip de una versión registrada en la auditoría. Usa la versión actual si todavía existe
 * (para saber si es especial); si ya se archivó, se apoya solo en su estado. */
export function describirAuditada(
  va: VersionAuditada | null,
  t: TiendaMatriz,
  versiones: Map<number, VersionMatriz>,
): { texto: string; variante: VarianteChip } {
  if (!va) return { texto: 'Sin asignar', variante: 'vacia' };
  const piloto = va.estado === 'piloto';
  const v = va.id !== null ? versiones.get(va.id) : undefined;
  const sigla = v ? (v.versionBaseId !== null ? `Especial ${t.codigo}` : SIGLA_TIPO_TIENDA[v.tipo]) : 'Versión';
  const variante: VarianteChip = piloto ? 'piloto'
    : !v ? 'vacia'
    : v.versionBaseId !== null ? 'esp'
    : (SIGLA_TIPO_TIENDA[v.tipo].toLowerCase() as VarianteChip);
  return { texto: piloto ? `Piloto ${sigla}` : sigla, variante };
}

export const ACCION_META: Record<AccionAsignacion, { etiqueta: string; variante: 'asigna' | 'cambia' | 'especial' | 'retira' | 'piloto' }> = {
  ASIGNACION: { etiqueta: 'Asignación', variante: 'asigna' },
  CAMBIO: { etiqueta: 'Cambio de versión', variante: 'cambia' },
  CREACION_ESPECIAL: { etiqueta: 'Creación de especial', variante: 'especial' },
  RETIRO: { etiqueta: 'Retiro', variante: 'retira' },
  ENTRADA_PILOTO: { etiqueta: 'Monta versión piloto', variante: 'piloto' },
  SALIDA_PILOTO: { etiqueta: 'Deja la versión piloto', variante: 'piloto' },
  PILOTO_PUBLICADO: { etiqueta: 'Piloto publicado', variante: 'asigna' },
};

/** Cómo se originó una edición; vacío para la edición a mano en Estructura. */
export const ORIGEN_LEGIBLE: Record<OrigenEdicion, string> = {
  MANUAL: '',
  VERSION: 'Desde las tiendas asignadas del planograma',
  PILOTO: 'Automático al promover a piloto',
  PUBLICACION: 'Automático al publicar',
};

export function formatoEdicion(id: number): string {
  return `ED-${String(id).padStart(6, '0')}`;
}
