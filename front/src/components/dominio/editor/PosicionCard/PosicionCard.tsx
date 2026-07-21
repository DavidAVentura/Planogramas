import { Badge } from '../../../ui/Badge/Badge';
import { FacingTile } from '../FacingTile/FacingTile';
import type { DecisionPosicion, ModoPosicion, Posicion } from '../../../../types/posicion';
import './PosicionCard.css';

const ETIQUETAS_DECISION: Record<DecisionPosicion, { label: string; bg: string; color: string }> = {
  ACTIVO: { label: 'Activo', bg: 'var(--cemaco-green-50)', color: 'var(--cemaco-green-700)' },
  INACTIVO: { label: 'Inactivo', bg: 'var(--ink-100)', color: 'var(--fg-3)' },
};

const ETIQUETAS_MODO: Record<ModoPosicion, string> = {
  PLANOGRAMA: 'Planograma',
  CROSS: 'Cross',
};

interface PosicionCardProps {
  posicion: Posicion;
  puedeEscribir: boolean;
  onDetalle: (posicion: Posicion) => void;
  onMover: (posicion: Posicion) => void;
  onCopiar: (posicion: Posicion) => void;
  onEliminar: (posicion: Posicion) => void;
}

export function PosicionCard({
  posicion,
  puedeEscribir,
  onDetalle,
  onMover,
  onCopiar,
  onEliminar,
}: PosicionCardProps) {
  const decisionMeta = ETIQUETAS_DECISION[posicion.decision];

  return (
    <div className="posicion-card">
      <div className="posicion-card__facings">
        {Array.from({ length: posicion.facings_horizontal }).map((_, i) => (
          <FacingTile key={i} sku={posicion.sku} cantidadApilable={posicion.cantidad_apilable} />
        ))}
      </div>

      <div className="posicion-card__info">
        <button type="button" className="posicion-card__sku" onClick={() => onDetalle(posicion)}>
          {posicion.sku}
        </button>
        <span className="posicion-card__detalle">
          {posicion.facings_horizontal} facing(s) × {posicion.unidades_por_facing} u · {posicion.ancho_asignado_cm} cm
          {posicion.capacidad_maxima != null && ` · cap. máx ${posicion.capacidad_maxima}`}
        </span>
        <span className="posicion-card__badges">
          <Badge bg={decisionMeta.bg} color={decisionMeta.color}>
            {decisionMeta.label}
          </Badge>
          {posicion.modo !== 'PLANOGRAMA' && (
            <Badge bg="var(--info-bg)" color="var(--info)">
              {ETIQUETAS_MODO[posicion.modo]}
            </Badge>
          )}
          {posicion.desborda_gondola && (
            <Badge bg="var(--danger-bg)" color="var(--danger)">
              Desborda góndola
            </Badge>
          )}
        </span>
      </div>

      {puedeEscribir && (
        <span className="posicion-card__acciones">
          <button type="button" onClick={() => onDetalle(posicion)}>
            Detalle
          </button>
          <button type="button" onClick={() => onMover(posicion)}>
            Mover
          </button>
          <button type="button" onClick={() => onCopiar(posicion)}>
            Copiar
          </button>
          <button type="button" onClick={() => onEliminar(posicion)}>
            Eliminar
          </button>
        </span>
      )}
    </div>
  );
}
