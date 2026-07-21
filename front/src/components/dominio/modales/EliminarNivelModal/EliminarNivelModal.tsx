import { useEffect, useState } from 'react';
import { ConfirmDialog } from '../../../ui/ConfirmDialog/ConfirmDialog';
import { useEliminarNivel, useResumenNivel } from '../../../../hooks/useNiveles';
import type { Nivel } from '../../../../types/nivel';

interface EliminarNivelModalProps {
  nivel: Nivel;
  onClose: () => void;
  onEliminado: () => void;
}

export function EliminarNivelModal({ nivel, onClose, onEliminado }: EliminarNivelModalProps) {
  const { obtenerResumen, cargando } = useResumenNivel();
  const { eliminar, enviando } = useEliminarNivel();
  const [totalPosiciones, setTotalPosiciones] = useState<number | null>(null);

  useEffect(() => {
    obtenerResumen(nivel.id).then((resumen) => {
      if (resumen) setTotalPosiciones(resumen.totalPosiciones);
    });
  }, [nivel.id, obtenerResumen]);

  async function confirmar() {
    const forzar = (totalPosiciones ?? 0) > 0;
    const eliminado = await eliminar(nivel.id, forzar);
    if (eliminado) onEliminado();
  }

  const mensaje = cargando
    ? 'Calculando el impacto de eliminar este nivel…'
    : `¿Eliminar el nivel ${nivel.orden}? Se perderán ${totalPosiciones ?? 0} posición(es) asignada(s). Esta acción no se puede deshacer.`;

  return (
    <ConfirmDialog
      titulo="Eliminar nivel"
      mensaje={mensaje}
      confirmarLabel="Eliminar"
      peligro
      cargando={cargando || enviando}
      onConfirm={confirmar}
      onClose={onClose}
    />
  );
}
