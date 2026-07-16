import { ConfirmDialog } from '../../../ui/ConfirmDialog/ConfirmDialog';
import { useArchivarPlanograma } from '../../../../hooks/usePlanogramas';
import type { PlanogramaDetalle } from '../../../../types/planograma';

interface ArchivarModalProps {
  planogramaId: number;
  nombre: string;
  onClose: () => void;
  onArchivado: (planograma: PlanogramaDetalle) => void;
}

export function ArchivarModal({ planogramaId, nombre, onClose, onArchivado }: ArchivarModalProps) {
  const { archivar, enviando } = useArchivarPlanograma();

  async function confirmar() {
    const archivado = await archivar(planogramaId);
    if (archivado) onArchivado(archivado);
  }

  return (
    <ConfirmDialog
      titulo="Archivar planograma"
      mensaje={`¿Archivar "${nombre}"? Se archivarán en cascada sus versiones en borrador, en desarrollo o piloto. Si tiene una versión publicada con tiendas asignadas, no se podrá archivar hasta desasignarla.`}
      confirmarLabel="Archivar"
      peligro
      cargando={enviando}
      onConfirm={confirmar}
      onClose={onClose}
    />
  );
}
