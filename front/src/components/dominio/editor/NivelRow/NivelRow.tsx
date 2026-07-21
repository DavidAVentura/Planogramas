import { Button } from '../../../ui/Button/Button';
import { PosicionesPanel } from '../PosicionesPanel/PosicionesPanel';
import type { GondolaListItem } from '../../../../types/gondola';
import type { Nivel } from '../../../../types/nivel';
import type { PosicionesDeNivel } from '../../../../types/posicion';
import './NivelRow.css';

interface NivelRowProps {
  niveles: Nivel[];
  puedeEscribir: boolean;
  onAgregar: () => void;
  onEditar: (nivel: Nivel) => void;
  onEliminar: (nivel: Nivel) => void;
  onMover: (nivel: Nivel, direccion: 'subir' | 'bajar') => void;
  gondolas: GondolaListItem[];
  gondolaActualId: number;
  posicionesPorNivel: Record<number, PosicionesDeNivel>;
  cargandoPosiciones: boolean;
  onCambioPosiciones: () => void;
}

export function NivelRow({
  niveles,
  puedeEscribir,
  onAgregar,
  onEditar,
  onEliminar,
  onMover,
  gondolas,
  gondolaActualId,
  posicionesPorNivel,
  cargandoPosiciones,
  onCambioPosiciones,
}: NivelRowProps) {
  return (
    <div className="nivel-row-lista">
      <div className="nivel-row-lista__header">
        <span className="nivel-row-lista__titulo">Niveles</span>
        {puedeEscribir && (
          <Button variante="outline" onClick={onAgregar}>
            + Agregar nivel
          </Button>
        )}
      </div>

      {niveles.map((nivel, indice) => (
        <div key={nivel.id} className="nivel-row">
          <div className="nivel-row__encabezado">
            {puedeEscribir && (
              <span className="nivel-row__mover">
                <button
                  type="button"
                  aria-label={`Subir nivel ${nivel.orden}`}
                  disabled={indice === 0}
                  onClick={() => onMover(nivel, 'subir')}
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label={`Bajar nivel ${nivel.orden}`}
                  disabled={indice === niveles.length - 1}
                  onClick={() => onMover(nivel, 'bajar')}
                >
                  ▼
                </button>
              </span>
            )}

            <div className="nivel-row__info">
              <span className="nivel-row__nombre">Nivel {nivel.orden}</span>
              <span className="nivel-row__detalle">
                {nivel.tipo_accesorio} · {nivel.altura_desde_piso_cm} cm desde el piso · {nivel.ancho_disponible_cm} cm
                disponibles
                {nivel.accesorio && ` · ${nivel.accesorio.nombre}`}
                {nivel.tamano_accesorio_pulgadas ? ` (${nivel.tamano_accesorio_pulgadas}")` : ''}
              </span>
              {nivel.notas && <span className="nivel-row__notas">{nivel.notas}</span>}
            </div>

            {puedeEscribir && (
              <span className="nivel-row__acciones">
                <button type="button" onClick={() => onEditar(nivel)}>
                  Editar
                </button>
                <button type="button" onClick={() => onEliminar(nivel)}>
                  Eliminar
                </button>
              </span>
            )}
          </div>

          <PosicionesPanel
            nivel={nivel}
            datos={posicionesPorNivel[nivel.id]}
            cargando={cargandoPosiciones}
            puedeEscribir={puedeEscribir}
            gondolas={gondolas}
            gondolaActualId={gondolaActualId}
            onCambio={onCambioPosiciones}
          />
        </div>
      ))}
    </div>
  );
}
