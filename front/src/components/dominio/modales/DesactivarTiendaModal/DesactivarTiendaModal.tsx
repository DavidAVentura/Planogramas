import { ConfirmDialog } from '../../../ui/ConfirmDialog/ConfirmDialog';
import { useCambiarEstadoTienda } from '../../../../hooks/useTiendas';
import type { Tienda } from '../../../../types/tienda';

interface DesactivarTiendaModalProps {
  tienda: Tienda;
  onClose: () => void;
  onDesactivada: (tienda: Tienda) => void;
}

export function DesactivarTiendaModal({ tienda, onClose, onDesactivada }: DesactivarTiendaModalProps) {
  const { cambiarEstado, enviando } = useCambiarEstadoTienda();

  async function confirmar() {
    const actualizada = await cambiarEstado(tienda.id, 'inactivo');
    if (actualizada) onDesactivada(actualizada);
  }

  const asignados =
    tienda.planogramas === 1 ? 'Su planograma asignado no se modifica' : `Sus ${tienda.planogramas} planogramas asignados no se modifican`;

  return (
    <ConfirmDialog
      titulo="Desactivar tienda"
      mensaje={`¿Desactivar "${tienda.nombre}"? Deja de aparecer al asignar tiendas a una versión. ${asignados}, y puede reactivarse después.`}
      confirmarLabel="Desactivar"
      peligro
      cargando={enviando}
      onConfirm={confirmar}
      onClose={onClose}
    />
  );
}
