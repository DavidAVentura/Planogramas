import { useEffect, useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { TiendasSelector } from '../TiendasSelector/TiendasSelector';
import { useTiendasVersion } from '../../../../hooks/useVersiones';
import type { TiendaResumen, VersionListItem } from '../../../../types/version';

interface TiendasAsignadasModalProps {
  version: VersionListItem;
  onClose: () => void;
  onGuardado: (tiendas: TiendaResumen[]) => void;
}

export function TiendasAsignadasModal({ version, onClose, onGuardado }: TiendasAsignadasModalProps) {
  const { tiendas, cargando, guardando, guardar } = useTiendasVersion(version.id);
  const [seleccionadas, setSeleccionadas] = useState<number[]>([]);

  useEffect(() => {
    if (tiendas) setSeleccionadas(tiendas.asignadas.map((t) => t.id));
  }, [tiendas]);

  const todasLasTiendas = tiendas ? [...tiendas.asignadas, ...tiendas.disponibles] : [];

  async function confirmar() {
    const guardadas = await guardar(seleccionadas);
    if (guardadas) onGuardado(guardadas);
  }

  return (
    <Modal
      titulo={`Tiendas de ${version.codigo}`}
      onClose={onClose}
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={cargando || guardando}>
            Guardar
          </Button>
        </>
      }
    >
      <TiendasSelector
        tiendas={todasLasTiendas}
        seleccionadas={seleccionadas}
        onChange={setSeleccionadas}
        cargando={cargando}
        vacioHint={`No hay tiendas activas de tipo ${version.tipo}.`}
      />
    </Modal>
  );
}
