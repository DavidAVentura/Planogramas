/** "SKU en la versión": totales por SKU sumando todas sus ubicaciones (GET /versiones/:id/skus). */
export interface UbicacionSku {
  posicionId: number;
  gondolaId: number;
  gondola: string;
  /** Índice de la sección (1, 2…) o null si la góndola no está dividida. */
  seccion: number | null;
  nivelId: number;
  /** Nivel dentro de su sección, contando de arriba hacia abajo. */
  nivel: number;
  facings: number;
  ganchos: number[];
}

export interface AlertaSku {
  codigo: 'MINMAX_VARIA' | 'MIN_MAYOR_MAX' | 'MAX_SUPERA_CAPACIDAD';
  mensaje: string;
}

export interface SkuVersion {
  sku: string;
  nombre: string | null;
  ubicaciones: UbicacionSku[];
  facings: number;
  /** Suma de capacidad máxima de sus ubicaciones; null si alguna no la tiene. */
  capacidadTotal: number | null;
  /** Valor común a todas las ubicaciones; null si varía o ninguna lo tiene. */
  minFinal: number | null;
  maxFinal: number | null;
  minVaria: boolean;
  maxVaria: boolean;
  ganchos: number[];
  alertas: AlertaSku[];
}

export interface SkusDeVersion {
  versionId: number;
  totalGanchos: number;
  /** Números de gancho calculados por posición (incluye los espacios pendientes). */
  ganchosPorPosicion: Record<string, number[]>;
  skus: SkuVersion[];
}

export interface SkuMinMaxCambios {
  min_final?: number | null;
  max_final?: number | null;
}
