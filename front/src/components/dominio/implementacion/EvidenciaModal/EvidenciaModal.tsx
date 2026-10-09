import { useRef, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { EstadoVersionBadge } from '../EstadoVersionBadge/EstadoVersionBadge';
import { useEvidenciasDeVersion, useImagenEvidencia } from '../../../../hooks/useEvidencias';
import { TIPOS_EVIDENCIA } from '../../../../utils/prepararImagenEvidencia';
import { textoAvanceEvidencia } from '../../../../domain/implementacion/miTienda';
import { formatearFechaHora, textoConteo, tooltipPlanograma } from '../../../../utils/formatters';
import type { Evidencia } from '../../../../types/evidencia';
import type { ResumenVersion, TiendaImplementador } from '../../../../types/implementacion';
import './EvidenciaModal.css';

interface EvidenciaModalProps {
  tienda: TiendaImplementador;
  planograma: ResumenVersion;
  /** Al cerrar, quien lo abrió recarga sus conteos de evidencia. */
  onClose: () => void;
}

function IconoCamara({ tamano = 14 }: { tamano?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function MiniaturaEvidencia({
  evidencia,
  gondola,
  eliminando,
  onQuitar,
}: {
  evidencia: Evidencia;
  gondola: string;
  eliminando: boolean;
  onQuitar: () => void;
}) {
  const { url, error } = useImagenEvidencia(evidencia.id);
  const fecha = formatearFechaHora(evidencia.created_at);

  return (
    <figure className="evidencia-foto">
      {url ? (
        <a className="evidencia-foto__imagen" href={url} target="_blank" rel="noreferrer" title="Ver foto completa">
          <img src={url} alt={`Foto de ${gondola}, ${fecha}`} />
        </a>
      ) : (
        <span className="evidencia-foto__imagen evidencia-foto__imagen--vacia">
          {error ? 'No se pudo cargar' : 'Cargando…'}
        </span>
      )}
      <figcaption className="evidencia-foto__pie">
        <span>{fecha}</span>
        <span className="evidencia-foto__autor">{evidencia.subido_por}</span>
      </figcaption>
      {evidencia.puedeEliminar && (
        <button
          type="button"
          className="evidencia-foto__quitar"
          onClick={onQuitar}
          disabled={eliminando}
          aria-label={`Quitar foto de ${gondola} del ${fecha}`}
          title="Quitar foto"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </figure>
  );
}

/** Fotos de las góndolas ya montadas de una versión, en la tienda del Implementador. */
export function EvidenciaModal({ tienda, planograma, onClose }: EvidenciaModalProps) {
  const { gondolas, cargando, subiendoEn, eliminando, agregar, eliminar } = useEvidenciasDeVersion(
    tienda.id,
    planograma.versionId,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const gondolaDestino = useRef<number | null>(null);

  const conFoto = gondolas.filter((g) => g.evidencias.length > 0).length;
  const completo = gondolas.length > 0 && conFoto === gondolas.length;

  function elegirFoto(gondolaId: number) {
    gondolaDestino.current = gondolaId;
    inputRef.current?.click();
  }

  async function onArchivo(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    const gondolaId = gondolaDestino.current;
    gondolaDestino.current = null;
    if (archivo && gondolaId !== null) await agregar(gondolaId, archivo);
  }

  function quitar(evidencia: Evidencia) {
    if (window.confirm('¿Quitar esta foto? Esta acción no se puede deshacer.')) eliminar(evidencia.id);
  }

  return createPortal(
    <Modal
      titulo="Evidencia de implementación"
      onClose={onClose}
      ancho="xl"
      footer={
        <>
          <span className="evidencia-modal__nota">
            Las fotos quedan asociadas a la versión {planograma.codigo} montada en esta tienda.
          </span>
          <Button onClick={onClose}>Listo</Button>
        </>
      }
    >
      <div className="evidencia-modal__version">
        <strong title={tooltipPlanograma(planograma.nombre, planograma.descripcion)}>{planograma.nombre}</strong>
        <span className="evidencia-modal__codigo">{planograma.codigo}</span>
        <EstadoVersionBadge estado={planograma.estado} />
        <span>· {tienda.nombre}</span>
      </div>

      <div className="evidencia-modal__indicaciones">
        <span>Sube al menos una foto de frente de cada góndola ya montada según esta versión.</span>
        {!cargando && gondolas.length > 0 && (
          <span
            className={`evidencia-modal__avance${completo ? ' evidencia-modal__avance--completo' : ''}`}
            aria-live="polite"
          >
            {textoAvanceEvidencia(conFoto, gondolas.length)}
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_EVIDENCIA.join(',')}
        capture="environment"
        className="evidencia-modal__input"
        onChange={onArchivo}
        tabIndex={-1}
        aria-hidden="true"
      />

      {cargando ? (
        <p className="evidencia-modal__vacio">Cargando evidencia…</p>
      ) : gondolas.length === 0 ? (
        <p className="evidencia-modal__vacio">Esta versión no tiene góndolas.</p>
      ) : (
        <div className="evidencia-modal__gondolas">
          {gondolas.map((g) => {
            const n = g.evidencias.length;
            const subiendo = subiendoEn === g.id;
            return (
              <section key={g.id} className="evidencia-gondola" aria-label={g.nombre}>
                <div className="evidencia-gondola__cabecera">
                  <h3 className="evidencia-gondola__nombre">{g.nombre}</h3>
                  <span className={`evidencia-gondola__conteo${n > 0 ? ' evidencia-gondola__conteo--con' : ''}`}>
                    {n === 0 ? 'Sin fotos' : textoConteo(n, 'foto', 'fotos')}
                  </span>
                </div>
                <div className="evidencia-gondola__fotos">
                  {g.evidencias.map((ev) => (
                    <MiniaturaEvidencia
                      key={ev.id}
                      evidencia={ev}
                      gondola={g.nombre}
                      eliminando={eliminando === ev.id}
                      onQuitar={() => quitar(ev)}
                    />
                  ))}
                  <button
                    type="button"
                    className="evidencia-gondola__agregar"
                    onClick={() => elegirFoto(g.id)}
                    disabled={subiendoEn !== null}
                    aria-label={`Agregar foto de ${g.nombre}`}
                  >
                    <IconoCamara tamano={20} />
                    {subiendo ? 'Subiendo…' : 'Agregar foto'}
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </Modal>,
    document.body,
  );
}
