import { Modal } from '../../../ui/Modal/Modal';
import './SeleccionarModoPosicionModal.css';

interface SeleccionarModoPosicionModalProps {
  onClose: () => void;
  onSeleccionarManual: () => void;
  onSeleccionarProducto: () => void;
}

export function SeleccionarModoPosicionModal({
  onClose,
  onSeleccionarManual,
  onSeleccionarProducto,
}: SeleccionarModoPosicionModalProps) {
  return (
    <Modal titulo="Agregar posición" onClose={onClose} ancho="sm">
      <div className="seleccionar-modo-posicion">
        <button type="button" className="seleccionar-modo-posicion__opcion" onClick={onSeleccionarManual}>
          <span className="seleccionar-modo-posicion__titulo">Manual</span>
          <span className="seleccionar-modo-posicion__descripcion">
            Completar el SKU y los datos de la posición a mano.
          </span>
        </button>
        <button type="button" className="seleccionar-modo-posicion__opcion" onClick={onSeleccionarProducto}>
          <span className="seleccionar-modo-posicion__titulo">Elegir producto</span>
          <span className="seleccionar-modo-posicion__descripcion">
            Buscar el producto por subcategoría y agregarlo con valores predefinidos.
          </span>
        </button>
      </div>
    </Modal>
  );
}
