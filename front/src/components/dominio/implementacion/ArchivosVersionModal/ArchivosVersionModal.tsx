import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { EstadoVersionBadge } from '../EstadoVersionBadge/EstadoVersionBadge';
import { useAdjuntosDeVersion } from '../../../../hooks/useAdjuntos';
import { abrirAdjunto } from '../../../../utils/adjuntoArchivo';
import { useToast } from '../../../../context/ToastContext';
import { formatearFecha } from '../../../../utils/formatters';
import { mensajeDeError } from '../../../../utils/errors';
import type { Adjunto } from '../../../../types/adjunto';
import type { PlanogramaImplementacion } from '../../../../types/implementacion';
import './ArchivosVersionModal.css';

const TIPO_CORTO: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
};

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ArchivosVersionModalProps {
  planograma: PlanogramaImplementacion;
  onClose: () => void;
}

/** Archivos que el analista cargó para la versión. Solo lectura: el Implementador solo descarga. */
export function ArchivosVersionModal({ planograma, onClose }: ArchivosVersionModalProps) {
  const { adjuntos, cargando } = useAdjuntosDeVersion(planograma.versionId);
  const [descargando, setDescargando] = useState<number | null>(null);
  const { mostrarToast } = useToast();

  async function descargar(adjunto: Adjunto) {
    setDescargando(adjunto.id);
    try {
      await abrirAdjunto(adjunto, true);
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo descargar el archivo'), 'error');
    } finally {
      setDescargando(null);
    }
  }

  return createPortal(
    <Modal
      titulo="Archivos adjuntos"
      onClose={onClose}
      ancho="lg"
      footer={
        <>
          <span className="archivos-version__nota">Archivos cargados por el analista para esta versión.</span>
          <Button variante="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </>
      }
    >
      <div className="archivos-version__version">
        <strong>{planograma.nombre}</strong>
        <span className="archivos-version__codigo">{planograma.codigo}</span>
        <EstadoVersionBadge estado={planograma.estado} />
      </div>

      {cargando ? (
        <p className="archivos-version__vacio">Cargando archivos…</p>
      ) : adjuntos.length === 0 ? (
        <p className="archivos-version__vacio archivos-version__vacio--borde">
          Esta versión todavía no tiene archivos adjuntos.
        </p>
      ) : (
        <ul className="archivos-version__lista">
          {adjuntos.map((a) => (
            <li key={a.id} className="archivos-version__fila">
              <span className="archivos-version__tipo" aria-hidden="true">
                {TIPO_CORTO[a.tipoMime] ?? 'ARCH'}
              </span>
              <span className="archivos-version__datos">
                <span className="archivos-version__nombre" title={a.nombreOriginal}>
                  {a.nombreOriginal}
                </span>
                <span className="archivos-version__meta">
                  {formatearTamano(a.tamanoBytes)} · subido el {formatearFecha(a.createdAt)}
                </span>
              </span>
              <button
                type="button"
                className="archivos-version__descargar"
                onClick={() => descargar(a)}
                disabled={descargando === a.id}
                aria-label={`Descargar ${a.nombreOriginal}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
                </svg>
                {descargando === a.id ? 'Descargando…' : 'Descargar'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>,
    document.body,
  );
}
