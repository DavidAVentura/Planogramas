import type { DecisionPosicion, ModoPosicion, PerfilRedondeo } from './posicion';

export interface MensajeChat {
  rol: 'user' | 'assistant';
  contenido: string;
}

/** Item que el agente fue recolectando durante la conversación — todavía no es una `Posicion`:
 * `nivel_orden`/`espacio_orden` pueden faltar (se resuelven en `ResumenBorradorModal`) y
 * `advertencia` marca un SKU que no se pudo validar contra el catálogo. */
export interface ItemBorrador {
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

export interface ContextoAgenteExtractor {
  subcategorias: string[];
  niveles: Array<{ id: number; orden: number; nombre?: string }>;
}

export interface MensajeAgenteExtractorInput {
  mensaje: string;
  historial: MensajeChat[];
  borrador_actual: ItemBorrador[];
  contexto: ContextoAgenteExtractor;
}

export interface RespuestaAgenteExtractor {
  mensaje_asistente: string;
  borrador: ItemBorrador[];
  listo_para_confirmar: boolean;
}
