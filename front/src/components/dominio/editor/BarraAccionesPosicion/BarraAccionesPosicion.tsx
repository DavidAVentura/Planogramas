import type { PosicionConProducto } from '../../../../types/posicion';
import './BarraAccionesPosicion.css';

interface BarraAccionesPosicionProps {
  posicion: PosicionConProducto;
  nivelOrden: number;
  onCambiarFacings: (posicion: PosicionConProducto, nuevoFacings: number) => void;
  onDuplicar: (posicion: PosicionConProducto) => void;
  onCopiar: (posicion: PosicionConProducto) => void;
  onMover: (posicion: PosicionConProducto) => void;
  onEditar: (posicion: PosicionConProducto) => void;
  onFicha: (sku: string) => void;
  onQuitar: (posicion: PosicionConProducto) => void;
  onDeseleccionar: () => void;
}

export function BarraAccionesPosicion({
  posicion,
  nivelOrden,
  onCambiarFacings,
  onDuplicar,
  onCopiar,
  onMover,
  onEditar,
  onFicha,
  onQuitar,
  onDeseleccionar,
}: BarraAccionesPosicionProps) {
  return (
    <div className="barra-acciones-posicion">
      <span className="barra-acciones-posicion__nombre">{posicion.producto?.nombre ?? posicion.sku}</span>

      <div className="barra-acciones-posicion__fila">
        <span className="barra-acciones-posicion__meta">
          {posicion.sku} · Nivel {nivelOrden}
        </span>

        <span className="barra-acciones-posicion__facings">
          <span className="barra-acciones-posicion__facings-label">Facings</span>
          <button
            type="button"
            disabled={posicion.facings_horizontal <= 1}
            onClick={() => onCambiarFacings(posicion, posicion.facings_horizontal - 1)}
          >
            −
          </button>
          <span className="barra-acciones-posicion__facings-valor">{posicion.facings_horizontal}</span>
          <button type="button" onClick={() => onCambiarFacings(posicion, posicion.facings_horizontal + 1)}>
            +
          </button>
        </span>

        <button type="button" className="barra-acciones-posicion__duplicar" onClick={() => onDuplicar(posicion)}>
          Duplicar
        </button>
        <button type="button" onClick={() => onCopiar(posicion)}>
          Copiar
        </button>
        <button type="button" onClick={() => onMover(posicion)}>
          Mover
        </button>
        <button type="button" onClick={() => onEditar(posicion)}>
          Editar
        </button>
        <button type="button" onClick={() => onFicha(posicion.sku)}>
          Ficha
        </button>
        <button type="button" className="barra-acciones-posicion__quitar" onClick={() => onQuitar(posicion)}>
          Quitar
        </button>
        <button
          type="button"
          className="barra-acciones-posicion__cerrar"
          title="Deseleccionar"
          aria-label="Deseleccionar"
          onClick={onDeseleccionar}
        >
          ×
        </button>
      </div>
    </div>
  );
}
