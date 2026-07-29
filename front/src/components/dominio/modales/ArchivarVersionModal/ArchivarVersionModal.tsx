import { ConfirmDialog } from '../../../ui/ConfirmDialog/ConfirmDialog';
import { useArchivarVersion } from '../../../../hooks/useVersiones';
import type { Version, VersionListItem } from '../../../../types/version';

interface ArchivarVersionModalProps {
  version: VersionListItem;
  onClose: () => void;
  onArchivada: (version: Version) => void;
}

export function ArchivarVersionModal({ version, onClose, onArchivada }: ArchivarVersionModalProps) {
  const { archivar, enviando } = useArchivarVersion();

  async function confirmar() {
    const archivada = await archivar(version.id);
    if (archivada) onArchivada(archivada);
  }

  return (
    <ConfirmDialog
      titulo="Archivar versión"
      mensaje={`¿Archivar "${version.codigo}"? No se podrá revertir. Las góndolas, niveles y posiciones quedan intactos para consulta histórica.`}
      confirmarLabel="Archivar"
      peligro
      cargando={enviando}
      onConfirm={confirmar}
      onClose={onClose}
    />
  );
}
