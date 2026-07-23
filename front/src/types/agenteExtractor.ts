import type { DecisionPosicion, ModoPosicion, PerfilRedondeo } from './posicion';
import type { TipoAccesorio } from './nivel';

export interface MensajeChat {
  rol: 'user' | 'assistant';
  contenido: string;
}

/** Acción "crear un nivel nuevo" recolectada por el agente — todavía no es un `Nivel`: el backend
 * ya resuelve `orden` (si el agente no lo dio, lo pone al final de la góndola) y `advertencia`
 * marca que faltan datos obligatorios (altura, tipo de accesorio y/o ancho) que hay que
 * preguntarle al usuario antes de poder crear el nivel. */
export interface AccionAgregarNivel {
  tipo_accion: 'agregar_nivel';
  orden: number;
  altura_desde_piso_cm: number | null;
  tipo_accesorio: TipoAccesorio | null;
  codigo_accesorio_id?: number | null;
  tamano_accesorio_pulgadas?: number | null;
  ancho_disponible_cm: number | null;
  notas?: string | null;
  advertencia?: string;
}

/** Acción "agregar un producto" recolectada por el agente — todavía no es una `Posicion`:
 * `nivel_orden`/`espacio_orden` pueden faltar (se resuelven en `ResumenBorradorModal`) y
 * `advertencia` marca un SKU que no se pudo validar contra el catálogo, o un nivel_orden que
 * referencia un nivel que no existe ni va a crearse antes en el mismo borrador. */
export interface AccionAgregarProducto {
  tipo_accion: 'agregar_producto';
  sku: string;
  nombre?: string | null;
  marca?: string | null;
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

export type AccionBorrador = AccionAgregarNivel | AccionAgregarProducto;

export interface ContextoAgenteExtractor {
  subcategorias: string[];
  niveles: Array<{ id: number; orden: number; nombre?: string }>;
}

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
