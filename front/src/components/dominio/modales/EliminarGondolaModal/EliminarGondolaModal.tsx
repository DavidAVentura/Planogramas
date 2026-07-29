import { useEffect, useState } from 'react';
import { ConfirmDialog } from '../../../ui/ConfirmDialog/ConfirmDialog';
import { useEliminarGondola, useResumenGondola } from '../../../../hooks/useGondolas';
import type { GondolaListItem } from '../../../../types/gondola';

interface EliminarGondolaModalProps {
  gondola: GondolaListItem;
  onClose: () => void;
  onEliminada: () => void;
}

export function EliminarGondolaModal({ gondola, onClose, onEliminada }: EliminarGondolaModalProps) {
  const { obtenerResumen, cargando } = useResumenGondola();
  const { eliminar, enviando } = useEliminarGondola();
  const [totalPosiciones, setTotalPosiciones] = useState<number | null>(null);
  const [totalNiveles, setTotalNiveles] = useState(gondola.totalNiveles);

  useEffect(() => {
    obtenerResumen(gondola.id).then((resumen) => {
      if (resumen) {
        setTotalNiveles(resumen.totalNiveles);
        setTotalPosiciones(resumen.totalPosiciones);
      }
    });
  }, [gondola.id, obtenerResumen]);

  async function confirmar() {
    const forzar = (totalPosiciones ?? 0) > 0;
    const eliminada = await eliminar(gondola.id, forzar);
    if (eliminada) onEliminada();
  }

  const mensaje = cargando
    ? 'Calculando el impacto de eliminar esta góndola…'
    : `¿Eliminar "${gondola.nombre}"? Se perderán ${totalNiveles} nivel(es) y ${totalPosiciones ?? 0} posición(es) asignada(s). Esta acción no se puede deshacer.`;

  return (
    <ConfirmDialog
      titulo="Eliminar góndola"
      mensaje={mensaje}
      confirmarLabel="Eliminar"
      peligro
      cargando={cargando || enviando}
      onConfirm={confirmar}
      onClose={onClose}
    />
  );
}
