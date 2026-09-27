import type { ElementoSeleccionado } from '../SeleccionMultipleModal/SeleccionMultipleModal';
import './BotonSeleccionMultiple.css';

interface BotonSeleccionMultipleProps {
  seleccionados: ElementoSeleccionado[];
  /** Texto sin selección (ej. "Todos los planogramas"). */
  textoVacio: string;
  /** Sustantivo para 2 o más elegidos (ej. "planogramas" → "3 planogramas"). */
  plural: string;
  onClick: () => void;
  /** Nombre accesible cuando no hay una etiqueta visible asociada. */
  ariaLabel?: string;
  ariaLabelledby?: string;
}

/** Botón con aspecto de select que abre un `SeleccionMultipleModal` y resume lo elegido. */
export function BotonSeleccionMultiple({
  seleccionados,
  textoVacio,
  plural,
  onClick,
  ariaLabel,
  ariaLabelledby,
}: BotonSeleccionMultipleProps) {
  const activo = seleccionados.length > 0;
  return (
    <button
      type="button"
      className={`boton-seleccion${activo ? ' boton-seleccion--activo' : ''}`}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-haspopup="dialog"
      title={activo ? seleccionados.map((s) => s.nombre).join(', ') : undefined}
      onClick={onClick}
    >
      {seleccionados.length === 0
        ? textoVacio
        : seleccionados.length === 1
          ? seleccionados[0].nombre
          : `${seleccionados.length} ${plural}`}
    </button>
  );
}
