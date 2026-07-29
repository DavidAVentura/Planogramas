import { ConfirmDialog } from '../../../ui/ConfirmDialog/ConfirmDialog';
import { useEliminarPosicion } from '../../../../hooks/usePosiciones';
import type { Posicion } from '../../../../types/posicion';

interface EliminarPosicionModalProps {
  posicion: Posicion;
  onClose: () => void;
  onEliminada: () => void;
}

export function EliminarPosicionModal({ posicion, onClose, onEliminada }: EliminarPosicionModalProps) {
  const { eliminar, enviando } = useEliminarPosicion();

  async function confirmar() {
    const eliminada = await eliminar(posicion.id);
    if (eliminada) onEliminada();
  }

  return (
    <ConfirmDialog
      titulo="Eliminar posición"
      mensaje={`¿Eliminar la posición del SKU ${posicion.sku}? Esta acción no se puede deshacer.`}
      confirmarLabel="Eliminar"
      peligro
      cargando={enviando}
      onConfirm={confirmar}
      onClose={onClose}
    />
  );
}
