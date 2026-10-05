import { useMemo, useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import { VisorImagenes, type ImagenVisor } from '../../../ui/VisorImagenes/VisorImagenes';
import { useEvidenciasDeVersion } from '../../../../hooks/useEvidencias';
import { useImagenCacheada } from '../../../../hooks/useImagenCacheada';
import { evidenciasService } from '../../../../services/evidencias.service';
import { formatearFechaHora, textoConteo } from '../../../../utils/formatters';
import type { PlanogramaMatriz, TiendaMatriz, VersionMatriz } from '../../../../types/asignacion';
import type { Evidencia } from '../../../../types/evidencia';
import './MontajeTiendaModal.css';

interface MontajeTiendaModalProps {
  planograma: PlanogramaMatriz;
  version: VersionMatriz;
  tienda: TiendaMatriz;
  onClose: () => void;
}

interface FotoMontaje extends ImagenVisor {
  evidencia: Evidencia;
  gondola: string;
}

function aFoto(evidencia: Evidencia, gondola: string): FotoMontaje {
  const fecha = formatearFechaHora(evidencia.created_at);
  return {
    evidencia,
    gondola,
    clave: `evidencia:${evidencia.id}`,
    alt: `Foto de ${gondola}, ${fecha}`,
    pie: (
      <>
        <strong>{gondola}</strong> · {fecha} · {evidencia.subido_por}
      </>
    ),
    descargar: () => evidenciasService.descargar(evidencia.id),
  };
}

function Miniatura({ foto, onAbrir }: { foto: FotoMontaje; onAbrir: () => void }) {
  const { url, error } = useImagenCacheada(foto.clave, foto.descargar);
  return (
    <figure className="montaje-foto">
      <button type="button" className="montaje-foto__imagen" onClick={onAbrir} title="Ver en pantalla completa" aria-label={`Ver ${foto.alt}`}>
        {url ? <img src={url} alt="" /> : <span>{error ? 'No se pudo cargar' : 'Cargando…'}</span>}
      </button>
      <figcaption className="montaje-foto__pie">
        <span>{formatearFechaHora(foto.evidencia.created_at)}</span>
        <span className="montaje-foto__autor">{foto.evidencia.subido_por}</span>
      </figcaption>
    </figure>
  );
}

/** Fotos del montaje (evidencia de implementación) de la versión que la tienda tiene asignada. */
export function MontajeTiendaModal({ planograma, version, tienda, onClose }: MontajeTiendaModalProps) {
  const { gondolas, cargando } = useEvidenciasDeVersion(tienda.id, version.id);
  const [abierta, setAbierta] = useState<number | null>(null);

  // Todas las fotos en orden de góndola: el visor navega entre góndolas sin cortes.
  const fotos = useMemo(() => gondolas.flatMap((g) => g.evidencias.map((ev) => aFoto(ev, g.nombre))), [gondolas]);
  const conFotos = gondolas.filter((g) => g.evidencias.length > 0);

  return (
    <>
      <Modal titulo="Montaje de tienda" onClose={onClose} ancho="xl">
        <div className="montaje-modal__contexto">
          <strong>{planograma.nombre}</strong>
          <span className="mono">{version.codigo}</span>
          <span>
            · <span className="mono">{tienda.codigo}</span> {tienda.nombre}
          </span>
          {!cargando && fotos.length > 0 && (
            <span className="montaje-modal__conteo">{textoConteo(fotos.length, 'foto', 'fotos')}</span>
          )}
        </div>

        {cargando ? (
          <p className="montaje-modal__cargando">Cargando fotos del montaje…</p>
        ) : fotos.length === 0 ? (
          <EmptyState titulo="La tienda todavía no ha subido fotos del montaje" hint="Las fotos se suben desde Mi tienda, como evidencia de implementación de la versión." />
        ) : (
          <div className="montaje-modal__gondolas">
            {conFotos.map((g) => (
              <section key={g.id} className="montaje-gondola" aria-label={g.nombre}>
                <h3 className="montaje-gondola__nombre">
                  {g.nombre}
                  <span className="montaje-gondola__conteo">{textoConteo(g.evidencias.length, 'foto', 'fotos')}</span>
                </h3>
                <div className="montaje-gondola__fotos">
                  {g.evidencias.map((ev) => {
                    const indice = fotos.findIndex((f) => f.evidencia.id === ev.id);
                    return <Miniatura key={ev.id} foto={fotos[indice]} onAbrir={() => setAbierta(indice)} />;
                  })}
                </div>
              </section>
            ))}
            {conFotos.length < gondolas.length && (
              <p className="montaje-modal__nota">
                Sin fotos: {gondolas.filter((g) => g.evidencias.length === 0).map((g) => g.nombre).join(', ')}.
              </p>
            )}
          </div>
        )}
      </Modal>

      {abierta !== null && <VisorImagenes imagenes={fotos} indiceInicial={abierta} onClose={() => setAbierta(null)} />}
    </>
  );
}
