import { useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { TiendasSelector } from '../TiendasSelector/TiendasSelector';
import { useTiendas } from '../../../../hooks/useTiendas';
import { usePromoverAPiloto } from '../../../../hooks/useVersiones';
import type { PromoverAPilotoResultado, VersionListItem } from '../../../../types/version';

interface PromoverPilotoModalProps {
  version: VersionListItem;
  onClose: () => void;
  onPromovida: (version: PromoverAPilotoResultado) => void;
}

export function PromoverPilotoModal({ version, onClose, onPromovida }: PromoverPilotoModalProps) {
  const { tiendas, cargando } = useTiendas({ tipo: version.tipo });
  const { promover, enviando } = usePromoverAPiloto();
  const [seleccionadas, setSeleccionadas] = useState<number[]>(version.tiendas.map((t) => t.id));

  async function confirmar() {
    const resultado = await promover(version.id, seleccionadas);
    if (resultado) onPromovida(resultado);
  }

  return (
    <Modal
      titulo={`Promover ${version.codigo} a piloto`}
      onClose={onClose}
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={seleccionadas.length === 0 || enviando}>
            Promover
          </Button>
        </>
      }
    >
      <p>Elegí al menos una tienda piloto para esta versión ({version.tipo}):</p>
      <TiendasSelector
        tiendas={tiendas}
        seleccionadas={seleccionadas}
        onChange={setSeleccionadas}
        cargando={cargando}
        vacioHint={`No hay tiendas activas de tipo ${version.tipo}.`}
      />
    </Modal>
  );
}
