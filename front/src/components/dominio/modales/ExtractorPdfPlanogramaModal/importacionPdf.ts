/** Lógica pura del importador de PDF: geometría de la vista previa del layout y armado del
 * request de POST /versiones/:id/importar-layout a partir de lo que el usuario revisó. */

import type {
  CuerpoImportar,
  CuerpoPdf,
  EspacioPdf,
  NivelPdf,
  SeccionPdf,
} from '../../../../types/extractorPdfPlanograma';

/** Qué hacer con un cuerpo: góndola nueva, reemplazar una existente (id) u omitirlo. */
export type DestinoCuerpo = 'NUEVA' | 'OMITIR' | number;

export interface DecisionCuerpo {
  destino: DestinoCuerpo;
  nombre: string;
}

/** SKU elegido por espacio (null = dejar la posición pendiente). */
export type SeleccionProductos = Record<string, string | null>;

export function claveEspacio(cuerpo: CuerpoPdf, nivel: NivelPdf, espacio: EspacioPdf): string {
  return `${cuerpo.clave}:${nivel.clave}:${espacio.orden_horizontal}`;
}

/** Selección inicial: solo los productos confirmados por el SKU impreso; los candidatos por
 * descripción nunca se asignan solos. */
export function seleccionInicial(cuerpos: CuerpoPdf[]): SeleccionProductos {
  const seleccion: SeleccionProductos = {};
  cuerpos.forEach((c) => c.niveles.forEach((n) => n.espacios.forEach((e) => {
    seleccion[claveEspacio(c, n, e)] = e.producto?.sku ?? null;
  })));
  return seleccion;
}

// ─── Geometría de la vista previa ────────────────────────────────────────────

export interface RectCm {
  x: number;
  /** Desde arriba de la góndola. */
  y: number;
  ancho: number;
  alto: number;
}

/** Rectángulo de cada hoja (clave → rect). Sin secciones, una hoja `null` del tamaño total.
 * Mismo cálculo que `calcularHojas` del back: la última hija toma lo que sobre. */
export function hojasDelCuerpo(cuerpo: CuerpoPdf): Map<string | null, RectCm> {
  const hojas = new Map<string | null, RectCm>();
  const raiz = cuerpo.secciones.find((s) => s.padre_clave === null);
  if (!raiz) {
    hojas.set(null, { x: 0, y: 0, ancho: cuerpo.ancho_cm, alto: cuerpo.alto_cm });
    return hojas;
  }
  const hijasDe = (clave: string): SeccionPdf[] =>
    cuerpo.secciones.filter((s) => s.padre_clave === clave).sort((a, b) => a.orden - b.orden);

  (function recorrer(nodo: SeccionPdf, rect: RectCm) {
    if (!nodo.es_division) {
      hojas.set(nodo.clave, rect);
      return;
    }
    const hijas = hijasDe(nodo.clave);
    const total = nodo.direccion === 'COLUMNAS' ? rect.ancho : rect.alto;
    let usado = 0;
    hijas.forEach((h, i) => {
      const tam = i === hijas.length - 1 ? Math.max(0, total - usado) : h.tam_cm;
      recorrer(h, nodo.direccion === 'COLUMNAS'
        ? { x: rect.x + usado, y: rect.y, ancho: tam, alto: rect.alto }
        : { x: rect.x, y: rect.y + usado, ancho: rect.ancho, alto: tam });
      usado += tam;
    });
  })(raiz, { x: 0, y: 0, ancho: cuerpo.ancho_cm, alto: cuerpo.alto_cm });
  return hojas;
}

/** Franja de cada nivel: desde su base hasta la base del nivel de arriba (o el techo de su hoja). */
export function franjasDeNiveles(cuerpo: CuerpoPdf): Array<{ nivel: NivelPdf; rect: RectCm }> {
  const hojas = hojasDelCuerpo(cuerpo);
  return cuerpo.niveles.map((nivel) => {
    const hoja = hojas.get(nivel.seccion_clave) ?? hojas.values().next().value!;
    const pisoHoja = cuerpo.alto_cm - (hoja.y + hoja.alto);
    const techoHoja = cuerpo.alto_cm - hoja.y;
    const encima = cuerpo.niveles
      .filter((n) => n.seccion_clave === nivel.seccion_clave && n.altura_desde_piso_cm > nivel.altura_desde_piso_cm)
      .map((n) => n.altura_desde_piso_cm);
    const techo = encima.length ? Math.min(...encima) : techoHoja;
    const base = Math.max(pisoHoja, nivel.altura_desde_piso_cm);
    return { nivel, rect: { x: hoja.x, y: cuerpo.alto_cm - techo, ancho: hoja.ancho, alto: Math.max(1, techo - base) } };
  });
}

// ─── Request de importación ──────────────────────────────────────────────────

function nombreDetectado(espacio: EspacioPdf): string | null {
  if (espacio.descripcion_visual) return espacio.descripcion_visual;
  return espacio.sku_impreso ? `SKU impreso ${espacio.sku_impreso}` : null;
}

function datosVision(cuerpo: CuerpoPdf, espacio: EspacioPdf, archivo: string): CuerpoImportar['niveles'][number]['posiciones'][number]['datos_vision'] {
  const motivo = espacio.sku_impreso
    ? `SKU impreso ${espacio.sku_impreso} no confirmado en el catálogo.`
    : 'El PDF no trae un SKU legible para este espacio.';
  return {
    detectedName: nombreDetectado(espacio) ?? 'Producto sin identificar',
    facings: espacio.facings,
    confidence: espacio.confianza,
    moduleId: `${cuerpo.nombre} · gancho ${espacio.ganchos.join(', ')}`,
    reason: `Importado del PDF ${archivo}. ${motivo}`,
    alternatives: espacio.candidatos.map((c) => ({ sku: c.sku, name: c.nombre, confidence: 0 })),
    origen: 'PDF',
    ganchos_pdf: espacio.ganchos,
    sku_impreso: espacio.sku_impreso,
  };
}

export function construirCuerpoImportar(
  cuerpo: CuerpoPdf,
  decision: DecisionCuerpo,
  seleccion: SeleccionProductos,
  archivo: string,
): CuerpoImportar {
  return {
    ...(typeof decision.destino === 'number'
      ? { destino: 'REEMPLAZAR' as const, gondola_id: decision.destino }
      : { destino: 'NUEVA' as const }),
    nombre: decision.nombre.trim() || cuerpo.nombre,
    ancho_cm: cuerpo.ancho_cm,
    alto_cm: cuerpo.alto_cm,
    profundidad_cm: cuerpo.profundidad_cm,
    secciones: cuerpo.secciones,
    niveles: cuerpo.niveles.map((nivel) => ({
      seccion_clave: nivel.seccion_clave,
      orden: nivel.orden,
      altura_desde_piso_cm: nivel.altura_desde_piso_cm,
      tipo_accesorio: nivel.tipo_accesorio,
      codigo_accesorio_id: nivel.codigo_accesorio_id,
      tamano_accesorio_pulgadas: nivel.tamano_accesorio_pulgadas,
      notas: nivel.codigo_accesorio ? `${nivel.codigo_accesorio} · ganchos ${rangoGanchos(nivel)}`.slice(0, 200) : null,
      posiciones: nivel.espacios.map((espacio) => {
        const sku = seleccion[claveEspacio(cuerpo, nivel, espacio)] ?? null;
        return {
          orden_horizontal: espacio.orden_horizontal,
          sku,
          ancho_asignado_cm: espacio.ancho_cm,
          facings_horizontal: espacio.facings,
          nombre_detectado: sku ? null : nombreDetectado(espacio),
          confidence: sku ? 100 : espacio.confianza,
          datos_vision: sku ? null : datosVision(cuerpo, espacio, archivo),
        };
      }),
    })),
  };
}

export function rangoGanchos(nivel: NivelPdf): string {
  const numeros = nivel.espacios.flatMap((e) => e.ganchos);
  if (!numeros.length) return '—';
  const min = Math.min(...numeros);
  const max = Math.max(...numeros);
  return min === max ? String(min) : `${min}-${max}`;
}
