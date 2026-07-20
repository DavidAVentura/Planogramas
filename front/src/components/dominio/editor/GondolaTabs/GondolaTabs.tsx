import { Button } from '../../../ui/Button/Button';
import type { GondolaListItem } from '../../../../types/gondola';
import './GondolaTabs.css';

interface GondolaTabsProps {
  gondolas: GondolaListItem[];
  activaId: number | null;
  puedeEscribir: boolean;
  onSeleccionar: (id: number) => void;
  onAgregar: () => void;
  onEditar: (gondola: GondolaListItem) => void;
  onEliminar: (gondola: GondolaListItem) => void;
  onMover: (gondola: GondolaListItem, direccion: 'subir' | 'bajar') => void;
}

export function GondolaTabs({
  gondolas,
  activaId,
  puedeEscribir,
  onSeleccionar,
  onAgregar,
  onEditar,
  onEliminar,
  onMover,
}: GondolaTabsProps) {
  return (
    <div className="gondola-tabs">
      <div className="gondola-tabs__lista">
        {gondolas.map((gondola, indice) => {
          const activa = gondola.id === activaId;
          return (
            <div
              key={gondola.id}
              className={`gondola-tabs__item${activa ? ' gondola-tabs__item--activa' : ''}`}
            >
              {puedeEscribir && (
                <span className="gondola-tabs__mover">
                  <button
                    type="button"
                    aria-label={`Subir ${gondola.nombre}`}
                    disabled={indice === 0}
                    onClick={() => onMover(gondola, 'subir')}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label={`Bajar ${gondola.nombre}`}
                    disabled={indice === gondolas.length - 1}
                    onClick={() => onMover(gondola, 'bajar')}
                  >
                    ▼
                  </button>
                </span>
              )}

              <button type="button" className="gondola-tabs__nombre" onClick={() => onSeleccionar(gondola.id)}>
                {gondola.nombre}
                <span className="gondola-tabs__conteo">{gondola.totalNiveles} niveles</span>
              </button>

              {puedeEscribir && activa && (
                <span className="gondola-tabs__acciones">
                  <button type="button" onClick={() => onEditar(gondola)}>
                    Editar
                  </button>
                  <button type="button" onClick={() => onEliminar(gondola)}>
                    Eliminar
                  </button>
                </span>
              )}
            </div>
          );
        })}
      </div>

      {puedeEscribir && (
        <Button variante="outline" onClick={onAgregar}>
          + Agregar góndola
        </Button>
      )}
    </div>
  );
}
