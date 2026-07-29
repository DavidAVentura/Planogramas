import type { DragEvent } from 'react';

const TIPO_DATOS = 'application/json';

export interface DatosArrastrePosicion {
  posicionId: number;
  nivelOrigenId: number;
}

export function escribirDatosArrastre(e: DragEvent, datos: DatosArrastrePosicion) {
  e.dataTransfer.setData(TIPO_DATOS, JSON.stringify(datos));
  e.dataTransfer.effectAllowed = 'move';
}

export function leerDatosArrastre(e: DragEvent): DatosArrastrePosicion | null {
  try {
    const raw = e.dataTransfer.getData(TIPO_DATOS);
    if (!raw) return null;
    return JSON.parse(raw) as DatosArrastrePosicion;
  } catch {
    return null;
  }
}
