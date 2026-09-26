import type { VarianteChip } from '../../../../domain/estructura/asignaciones';
import './ChipVersion.css';

interface ChipVersionProps {
  texto: string;
  variante: VarianteChip;
  tachado?: boolean;
}

/** Chip con el color de la versión (TG/TM/TE/especial/piloto/sin asignar). */
export function ChipVersion({ texto, variante, tachado = false }: ChipVersionProps) {
  return (
    <span className={`chip-version chip-version--${variante}${tachado ? ' chip-version--tachado' : ''}`}>{texto}</span>
  );
}
