import { useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { usePublicarVersion } from '../../../../hooks/useVersiones';
import type { ErrorBloqueante, PromoverAPublicadoResultado, VersionListItem } from '../../../../types/version';
import './PublicarVersionModal.css';

interface PublicarVersionModalProps {
  version: VersionListItem;
  onClose: () => void;
  onPublicada: (version: PromoverAPublicadoResultado) => void;
}

export function PublicarVersionModal({ version, onClose, onPublicada }: PublicarVersionModalProps) {
  const { publicar, enviando } = usePublicarVersion();
  const [errores, setErrores] = useState<ErrorBloqueante[] | null>(null);

  async function confirmar() {
    const resultado = await publicar(version.id);
    if (resultado.version) onPublicada(resultado.version);
    else if (resultado.erroresBloqueantes) setErrores(resultado.erroresBloqueantes);
  }

  return (
    <Modal
      titulo={`Publicar ${version.codigo}`}
      onClose={onClose}
      footer={
        errores ? (
          <Button variante="outline" onClick={onClose}>
            Cerrar
          </Button>
        ) : (
          <>
            <Button variante="outline" onClick={onClose} disabled={enviando}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={enviando}>
              Publicar
            </Button>
          </>
        )
      }
    >
      {errores ? (
        <>
          <p>No se puede publicar — hay errores bloqueantes que resolver primero:</p>
          <ul className="publicar-version-modal__errores">
            {errores.map((e) => (
              <li key={e.posicionId}>
                <strong>{e.gondola}</strong>, nivel {e.nivel}, SKU {e.sku}: {e.error}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>
          ¿Publicar la versión <strong>{version.codigo}</strong>? Esto archiva automáticamente la versión
          publicada anterior del mismo tipo, si existe.
        </p>
      )}
    </Modal>
  );
}
