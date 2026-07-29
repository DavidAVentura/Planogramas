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
  const gondolaActiva = gondolas.find((g) => g.id === activaId) ?? null;

  return (
    <div className="gondola-tabs">
      <div className="gondola-tabs__barra">
        <div className="gondola-tabs__lista">
          {gondolas.map((gondola, indice) => {
            const activa = gondola.id === activaId;
            return (
              <div key={gondola.id} className="gondola-tabs__item">
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

                <button
                  type="button"
                  className={`gondola-tabs__pill${activa ? ' gondola-tabs__pill--activa' : ''}`}
                  onClick={() => onSeleccionar(gondola.id)}
                >
                  {gondola.nombre}
                </button>
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

      {gondolaActiva && (
        <div className="gondola-tabs__header">
          <div className="gondola-tabs__header-info">
            <strong>{gondolaActiva.nombre}</strong>
            {' · '}
            {gondolaActiva.ancho_cm}×{gondolaActiva.alto_cm}×{gondolaActiva.profundidad_cm} cm
            {' · '}
            {gondolaActiva.posicion_en_tienda ?? 'Sin posición definida'}
          </div>

          {puedeEscribir && (
            <span className="gondola-tabs__header-acciones">
              <button type="button" onClick={() => onEditar(gondolaActiva)}>
                Editar góndola
              </button>
              <button type="button" className="gondola-tabs__header-eliminar" onClick={() => onEliminar(gondolaActiva)}>
                Eliminar
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
