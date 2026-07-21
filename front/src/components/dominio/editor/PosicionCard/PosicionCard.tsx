import type { DragEvent } from 'react';
import { FacingTile } from '../FacingTile/FacingTile';
import { escribirDatosArrastre, leerDatosArrastre, type DatosArrastrePosicion } from '../../../../utils/dragPosicion';
import type { PosicionConProducto } from '../../../../types/posicion';
import './PosicionCard.css';

const MAX_TILES_VISIBLES = 8;

interface PosicionCardProps {
  posicion: PosicionConProducto;
  seleccionada: boolean;
  puedeEscribir: boolean;
  onSeleccionar: (posicionId: number) => void;
  onDetalle: (posicion: PosicionConProducto) => void;
  onAbrirFicha: (sku: string) => void;
  onSoltarPosicion: (datos: DatosArrastrePosicion, nivelDestinoId: number, ordenDestino: number) => void;
}

export function PosicionCard({
  posicion,
  seleccionada,
  puedeEscribir,
  onSeleccionar,
  onDetalle,
  onAbrirFicha,
  onSoltarPosicion,
}: PosicionCardProps) {
  const tilesVisibles = Math.min(posicion.facings_horizontal, MAX_TILES_VISIBLES);

  function onDragStart(e: DragEvent<HTMLDivElement>) {
    escribirDatosArrastre(e, { posicionId: posicion.id, nivelOrigenId: posicion.nivelId });
  }

  function onDropAqui(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const datos = leerDatosArrastre(e);
    if (!datos || datos.posicionId === posicion.id) return;
    onSoltarPosicion(datos, posicion.nivelId, posicion.orden_horizontal);
  }

  return (
    <div
      className={`posicion-card${seleccionada ? ' posicion-card--seleccionada' : ''}`}
      draggable={puedeEscribir}
      onDragStart={onDragStart}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropAqui}
      onClick={() => onSeleccionar(posicion.id)}
      onDoubleClick={() => {
        onSeleccionar(posicion.id);
        onDetalle(posicion);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onSeleccionar(posicion.id);
        onAbrirFicha(posicion.sku);
      }}
      title={posicion.producto?.nombre ?? posicion.sku}
    >
      <span className="posicion-card__badge-facings">×{posicion.facings_horizontal}</span>

      <div className="posicion-card__facings">
        {Array.from({ length: tilesVisibles }).map((_, i) => (
          <FacingTile
            key={i}
            sku={posicion.sku}
            nombre={posicion.producto?.nombre ?? null}
            imagenUrl={posicion.producto?.imagen_url ?? null}
            cantidadApilable={posicion.cantidad_apilable}
          />
        ))}
      </div>
    </div>
  );
}
