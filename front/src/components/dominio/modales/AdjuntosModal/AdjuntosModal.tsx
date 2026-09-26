import { useRef, useState, type ChangeEvent } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { Table, type TableColumn } from '../../../ui/Table/Table';
import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import { adjuntosService } from '../../../../services/adjuntos.service';
import { useAdjuntosDeVersion } from '../../../../hooks/useAdjuntos';
import { useToast } from '../../../../context/ToastContext';
import { formatearFecha } from '../../../../utils/formatters';
import { mensajeDeError } from '../../../../utils/errors';
import type { Adjunto } from '../../../../types/adjunto';
import type { VersionListItem } from '../../../../types/version';
import './AdjuntosModal.css';

// Mismos estados editables que valida el backend (ver adjunto.entity.js) — evita que el usuario
// dispare una subida/reemplazo/eliminación que el servidor va a rechazar con 422.
const ESTADOS_EDITABLES = ['borrador', 'en_desarrollo', 'piloto'];

const ACEPTA_ARCHIVOS = 'image/jpeg,image/png,image/webp,application/pdf';

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Íconos inline (mismo estilo stroke que AgenteExtractorChat.tsx) — los botones de acciones de
// esta tabla van solo con ícono + tooltip nativo (title/aria-label), sin texto.
function IconoDescargar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconoReemplazar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function IconoEliminar() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

interface AdjuntosModalProps {
  version: VersionListItem;
  onClose: () => void;
}

export function AdjuntosModal({ version, onClose }: AdjuntosModalProps) {
  const { adjuntos, cargando, enviando, agregar, reemplazar, eliminar } = useAdjuntosDeVersion(version.id);
  const { mostrarToast } = useToast();
  const inputReemplazoRef = useRef<HTMLInputElement>(null);
  const [idAReemplazar, setIdAReemplazar] = useState<number | null>(null);

  const editable = ESTADOS_EDITABLES.includes(version.estado);

  async function onSeleccionarNuevo(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (archivo) await agregar(archivo);
  }

  function onReemplazarClick(id: number) {
    setIdAReemplazar(id);
    inputReemplazoRef.current?.click();
  }

  async function onSeleccionarReemplazo(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (archivo && idAReemplazar != null) await reemplazar(idAReemplazar, archivo);
    setIdAReemplazar(null);
  }

  // La ventana se abre antes del await para que el navegador no la bloquee como popup; luego se
  // le carga el archivo ya descargado con el token de sesión.
  async function onDescargarClick(a: Adjunto) {
    const ventana = window.open('', '_blank');
    try {
      const archivo = await adjuntosService.descargar(a.id);
      const url = URL.createObjectURL(archivo);
      if (ventana) ventana.location.href = url;
      else window.location.assign(url);
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      ventana?.close();
      mostrarToast(mensajeDeError(err, 'No se pudo descargar el adjunto'), 'error');
    }
  }

  async function onEliminarClick(a: Adjunto) {
    if (window.confirm(`¿Eliminar "${a.nombreOriginal}"? Esta acción no se puede deshacer.`)) {
      await eliminar(a.id);
    }
  }

  const columnas: TableColumn<Adjunto>[] = [
    { key: 'nombre', header: 'Archivo', render: (a) => a.nombreOriginal },
    { key: 'tamano', header: 'Tamaño', render: (a) => formatearTamano(a.tamanoBytes) },
    { key: 'subido', header: 'Subido', render: (a) => formatearFecha(a.createdAt) },
    {
      key: 'acciones',
      header: 'Acciones',
      render: (a) => (
        <span className="adjuntos-modal__acciones">
          <Button
            variante="outline"
            className="adjuntos-modal__accion-icono"
            onClick={() => onDescargarClick(a)}
            title="Descargar"
            aria-label="Descargar"
          >
            <IconoDescargar />
          </Button>
          {editable && (
            <>
              <Button
                variante="outline"
                className="adjuntos-modal__accion-icono"
                disabled={enviando}
                onClick={() => onReemplazarClick(a.id)}
                title="Reemplazar"
                aria-label="Reemplazar"
              >
                <IconoReemplazar />
              </Button>
              <Button
                variante="peligro"
                className="adjuntos-modal__accion-icono"
                disabled={enviando}
                onClick={() => onEliminarClick(a)}
                title="Eliminar"
                aria-label="Eliminar"
              >
                <IconoEliminar />
              </Button>
            </>
          )}
        </span>
      ),
    },
  ];

  return (
    <Modal titulo={`Adjuntos de ${version.codigo}`} onClose={onClose} ancho="lg">
      <div className="adjuntos-modal">
        {editable ? (
          <div className="adjuntos-modal__subir">
            <label className={`button button--outline${enviando ? ' button--disabled' : ''}`}>
              {enviando ? 'Subiendo…' : '+ Añadir archivo'}
              <input type="file" accept={ACEPTA_ARCHIVOS} onChange={onSeleccionarNuevo} disabled={enviando} hidden />
            </label>
            <span className="adjuntos-modal__hint">Imágenes (JPG, PNG, WEBP) o PDF — máximo 5MB.</span>
          </div>
        ) : (
          <p className="adjuntos-modal__hint">
            Esta versión está en estado <strong>{version.estado}</strong> — no admite agregar, reemplazar ni
            eliminar adjuntos. Todavía se pueden descargar los existentes.
          </p>
        )}

        {!cargando && (
          <Table
            columns={columnas}
            rows={adjuntos}
            rowKey={(a) => a.id}
            vacio={<EmptyState titulo="Esta versión todavía no tiene adjuntos" />}
          />
        )}

        <input
          ref={inputReemplazoRef}
          type="file"
          accept={ACEPTA_ARCHIVOS}
          onChange={onSeleccionarReemplazo}
          hidden
        />
      </div>
    </Modal>
  );
}
