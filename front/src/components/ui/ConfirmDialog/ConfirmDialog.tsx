import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  titulo: string;
  mensaje: string;
  confirmarLabel?: string;
  cancelarLabel?: string;
  peligro?: boolean;
  cargando?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  titulo,
  mensaje,
  confirmarLabel = 'Confirmar',
  cancelarLabel = 'Cancelar',
  peligro = false,
  cargando = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      titulo={titulo}
      onClose={onClose}
      ancho="sm"
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={cargando}>
            {cancelarLabel}
          </Button>
          <Button variante={peligro ? 'peligro' : 'primary'} onClick={onConfirm} disabled={cargando}>
            {confirmarLabel}
          </Button>
        </>
      }
    >
      <p className="confirm-dialog__mensaje">{mensaje}</p>
    </Modal>
  );
}
