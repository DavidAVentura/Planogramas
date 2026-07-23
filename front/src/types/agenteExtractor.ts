import type { DecisionPosicion, ModoPosicion, PerfilRedondeo } from './posicion';
import type { TipoAccesorio } from './nivel';

export interface MensajeChat {
  rol: 'user' | 'assistant';
  contenido: string;
}

// ─── Contexto enviado al agente ──────────────────────────────────────────────
// Todo direccionamiento usa coordenadas legibles (orden dentro de su padre), nunca ids de BD — el
// modelo no conoce ids internos. Es el mismo criterio que ya usaba `nivel_orden` antes de esta
// ampliación, extendido a góndolas y posiciones.

export interface ContextoGondola {
  gondola_orden: number;
  nombre: string;
  total_niveles: number;
}

export interface ContextoNivel {
  gondola_orden: number;
  nivel_orden: number;
  tipo_accesorio: TipoAccesorio;
}

export interface ContextoPosicion {
  gondola_orden: number;
  nivel_orden: number;
  espacio_orden: number;
  sku: string;
  nombre: string | null;
}

export interface ContextoAccesorio {
  codigo: string;
  nombre: string;
  tipo: string;
}

export interface ContextoAgenteExtractor {
  subcategorias: string[];
  gondolas: ContextoGondola[];
  niveles: ContextoNivel[];
  posiciones: ContextoPosicion[];
  accesorios: ContextoAccesorio[];
}

// ─── Acciones: Góndola ────────────────────────────────────────────────────────

export interface AccionCrearGondola {
  tipo_accion: 'crear_gondola';
  /** Resuelto por el backend (MAX(orden)+1 al momento de aplicar) — el modelo no lo elige. */
  gondola_orden: number;
  nombre: string | null;
  ancho_cm: number | null;
  alto_cm: number | null;
  profundidad_cm: number | null;
  posicion_en_tienda?: string | null;
  advertencia?: string;
}

export interface AccionEditarGondola {
  tipo_accion: 'editar_gondola';
  gondola_orden: number;
  nombre?: string | null;
  ancho_cm?: number | null;
  alto_cm?: number | null;
  profundidad_cm?: number | null;
  posicion_en_tienda?: string | null;
  advertencia?: string;
}

export interface AccionEliminarGondola {
  tipo_accion: 'eliminar_gondola';
  gondola_orden: number;
  advertencia?: string;
}

export interface AccionReordenarGondolas {
  tipo_accion: 'reordenar_gondolas';
  /** gondola_orden actuales, listados en la secuencia nueva deseada. */
  orden_gondolas: number[];
  advertencia?: string;
}

// ─── Acciones: Nivel ──────────────────────────────────────────────────────────

export interface AccionAgregarNivel {
  tipo_accion: 'agregar_nivel';
  /** Si no se da, cae en la primera góndola de la versión (o la única, en el caso piloto). */
  gondola_orden?: number;
  /** Si no se da, se coloca al final de la góndola destino. */
  nivel_orden?: number;
  altura_desde_piso_cm: number | null;
  tipo_accesorio: TipoAccesorio | null;
  codigo_accesorio_id?: number | null;
  tamano_accesorio_pulgadas?: number | null;
  ancho_disponible_cm: number | null;
  notas?: string | null;
  advertencia?: string;
}

export interface AccionEditarNivel {
  tipo_accion: 'editar_nivel';
  gondola_orden: number;
  nivel_orden: number;
  altura_desde_piso_cm?: number | null;
  tipo_accesorio?: TipoAccesorio | null;
  codigo_accesorio_id?: number | null;
  tamano_accesorio_pulgadas?: number | null;
  ancho_disponible_cm?: number | null;
  notas?: string | null;
  advertencia?: string;
}

export interface AccionEliminarNivel {
  tipo_accion: 'eliminar_nivel';
  gondola_orden: number;
  nivel_orden: number;
  advertencia?: string;
}

export interface AccionReordenarNiveles {
  tipo_accion: 'reordenar_niveles';
  gondola_orden: number;
  /** nivel_orden actuales, listados en la secuencia nueva deseada. */
  orden_niveles: number[];
  advertencia?: string;
}

// ─── Acciones: Producto / posición ("espacio") ────────────────────────────────

export interface AccionAgregarProducto {
  tipo_accion: 'agregar_producto';
  sku: string;
  nombre?: string | null;
  marca?: string | null;
  gondola_orden?: number;
  nivel_orden?: number;
  espacio_orden?: number;
  facings_horizontal: number;
  cantidad_apilable: number;
  unidades_por_facing: number;
  perfil_redondeo: PerfilRedondeo;
  modo: ModoPosicion;
  decision: DecisionPosicion;
  advertencia?: string;
}

export interface AccionEditarProducto {
  tipo_accion: 'editar_producto';
  gondola_orden: number;
  nivel_orden: number;
  espacio_orden: number;
  facings_horizontal?: number | null;
  cantidad_apilable?: number | null;
  unidades_por_facing?: number | null;
  perfil_redondeo?: PerfilRedondeo | null;
  min_final?: number | null;
  max_final?: number | null;
  modo?: ModoPosicion | null;
  decision?: DecisionPosicion | null;
  cross_externo?: boolean | null;
  montar_en_display?: boolean | null;
  observaciones?: string | null;
  desborda_gondola?: boolean | null;
  nota_desborde?: string | null;
  advertencia?: string;
}

export interface AccionMoverProducto {
  tipo_accion: 'mover_producto';
  gondola_orden: number;
  nivel_orden: number;
  espacio_orden: number;
  gondola_orden_destino: number;
  nivel_orden_destino: number;
  /** Si no se da, siguiente espacio libre del nivel destino. */
  espacio_orden_destino?: number;
  advertencia?: string;
}

export interface AccionDuplicarProducto {
  tipo_accion: 'duplicar_producto';
  gondola_orden: number;
  nivel_orden: number;
  espacio_orden: number;
  gondola_orden_destino: number;
  nivel_orden_destino: number;
  espacio_orden_destino?: number;
  advertencia?: string;
}

export interface AccionEliminarProducto {
  tipo_accion: 'eliminar_producto';
  gondola_orden: number;
  nivel_orden: number;
  espacio_orden: number;
  advertencia?: string;
}

// ─── Acciones: accesorios de montaje de una posición ──────────────────────────

export interface AccionAgregarAccesorioPosicion {
  tipo_accion: 'agregar_accesorio_posicion';
  gondola_orden: number;
  nivel_orden: number;
  espacio_orden: number;
  accesorio_codigo: string;
  nota_libre?: string | null;
  advertencia?: string;
}

export interface AccionQuitarAccesorioPosicion {
  tipo_accion: 'quitar_accesorio_posicion';
  gondola_orden: number;
  nivel_orden: number;
  espacio_orden: number;
  accesorio_codigo: string;
  advertencia?: string;
}

// ─── Acciones: catálogo de producto (medidas físicas) ─────────────────────────

export interface AccionActualizarMedidasProducto {
  tipo_accion: 'actualizar_medidas_producto';
  sku: string;
  ancho_cm: number | null;
  alto_cm: number | null;
  profundidad_cm: number | null;
  advertencia?: string;
}

export interface AccionValidarDimensionesProducto {
  tipo_accion: 'validar_dimensiones_producto';
  sku: string;
  advertencia?: string;
}

// ─── Unión discriminada ────────────────────────────────────────────────────────

export type AccionBorrador =
  | AccionCrearGondola
  | AccionEditarGondola
  | AccionEliminarGondola
  | AccionReordenarGondolas
  | AccionAgregarNivel
  | AccionEditarNivel
  | AccionEliminarNivel
  | AccionReordenarNiveles
  | AccionAgregarProducto
  | AccionEditarProducto
  | AccionMoverProducto
  | AccionDuplicarProducto
  | AccionEliminarProducto
  | AccionAgregarAccesorioPosicion
  | AccionQuitarAccesorioPosicion
  | AccionActualizarMedidasProducto
  | AccionValidarDimensionesProducto;

// ─── Resultado de ejecución (al confirmar el borrador) ────────────────────────

export type EstadoResultadoAccion = 'ejecutada' | 'fallida' | 'omitida';

export interface ResultadoAccion {
  indice: number;
  tipoAccion: AccionBorrador['tipo_accion'];
  /** Descripción legible de la acción (para la tabla de resultados), ej. "Producto 10012345 → nivel 2, espacio 3". */
  resumen: string;
  estado: EstadoResultadoAccion;
  /** Motivo de la falla o de la omisión (ej. mensaje de error de la API, o "depende de la acción 2, que falló"). */
  motivo?: string;
}

// ─── Request / response del endpoint ───────────────────────────────────────────

export interface MensajeAgenteExtractorInput {
  mensaje: string;
  historial: MensajeChat[];
  borrador_actual: AccionBorrador[];
  contexto: ContextoAgenteExtractor;
}

export interface RespuestaAgenteExtractor {
  mensaje_asistente: string;
  borrador: AccionBorrador[];
  listo_para_confirmar: boolean;
}
