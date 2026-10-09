import { Link } from 'react-router-dom';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { ChipVersion } from '../../estructura/ChipVersion/ChipVersion';
import { useResumenVersion } from '../../../../hooks/useAsignaciones';
import { useAdjuntosDeVersion } from '../../../../hooks/useAdjuntos';
import { abrirAdjunto } from '../../../../utils/adjuntoArchivo';
import { useToast } from '../../../../context/ToastContext';
import { mensajeDeError } from '../../../../utils/errors';
import { SIGLA_TIPO_TIENDA, TIPO_TIENDA_META } from '../../../../constants/tiendas';
import { formatearFecha, subcategoriaSinCodigo, tooltipPlanograma } from '../../../../utils/formatters';
import type { VarianteChip } from '../../../../domain/estructura/asignaciones';
import type { TiendaMatriz } from '../../../../types/asignacion';
import type { Adjunto } from '../../../../types/adjunto';
import './VersionResumenModal.css';

const MODOS: { id: 'PLANOGRAMA' | 'CROSS' | 'IMPULSO' | 'PENDIENTE'; etiqueta: string }[] = [
  { id: 'PLANOGRAMA', etiqueta: 'Planograma' },
  { id: 'CROSS', etiqueta: 'Cross' },
  { id: 'IMPULSO', etiqueta: 'Impulso' },
  { id: 'PENDIENTE', etiqueta: 'Pendiente' },
];

interface VersionResumenModalProps {
  versionId: number;
  /** Tienda desde cuya celda se abrió. */
  tienda: TiendaMatriz;
  onClose: () => void;
}

function tamano(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function extension(tipoMime: string) {
  return tipoMime === 'application/pdf' ? 'PDF' : tipoMime.replace('image/', '').toUpperCase();
}

export function VersionResumenModal({ versionId, tienda, onClose }: VersionResumenModalProps) {
  const { resumen, cargando } = useResumenVersion(versionId);
  const { adjuntos, cargando: cargandoAdjuntos } = useAdjuntosDeVersion(versionId);
  const { mostrarToast } = useToast();

  async function descargar(a: Adjunto) {
    try {
      await abrirAdjunto(a);
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo descargar el adjunto'), 'error');
    }
  }

  const version = resumen?.version;
  const piloto = version?.estado === 'piloto';
  const esEspecial = version?.versionBaseId !== null && version?.versionBaseId !== undefined;
  const sigla = version ? SIGLA_TIPO_TIENDA[version.tipo] : '';
  const variante: VarianteChip = piloto ? 'piloto' : esEspecial ? 'esp' : (sigla.toLowerCase() as VarianteChip);
  const e = resumen?.estructura;

  return (
    <Modal
      titulo={resumen ? resumen.planograma.nombre : 'Versión'}
      tituloTooltip={resumen ? tooltipPlanograma(resumen.planograma.nombre, resumen.planograma.descripcion) : undefined}
      ancho="xl"
      claseModal="version-resumen"
      onClose={onClose}
      footer={
        <>
          <span className="version-resumen__pie">
            {piloto ? 'Solo lectura. La versión piloto se edita en el lienzo hasta que se publique.' : 'Solo lectura. Para editar la versión, ábrela en el lienzo.'}
          </span>
          <Button variante="outline" onClick={onClose}>
            Cerrar
          </Button>
          {version && (
            <Link
              className="button button--primary version-resumen__lienzo"
              to={`/planogramas/${version.planogramaId}/versiones/${version.id}/lienzo`}
              target="_blank"
              rel="noopener"
            >
              Ver lienzo ↗<span className="version-resumen__oculto"> (se abre en otra pestaña)</span>
            </Link>
          )}
        </>
      }
    >
      {cargando || !resumen || !version || !e ? (
        <p className="version-resumen__cargando">Cargando versión…</p>
      ) : (
        <>
          <div className="version-resumen__encabezado">
            <ChipVersion texto={esEspecial ? `Especial · ${tienda.codigo}` : `${TIPO_TIENDA_META[version.tipo].label} · ${sigla}`} variante={variante} />
            <span className={`version-resumen__estado version-resumen__estado--${version.estado}`}>
              {piloto ? 'Piloto' : version.estado === 'publicado' ? 'Publicada' : version.estado}
            </span>
            <span className="mono">{version.codigo}</span>
            <span>· {resumen.planograma.departamento}</span>
            <span>
              · Abierta desde <strong>{tienda.codigo} {tienda.nombre}</strong>
            </span>
          </div>

          <div className="version-resumen__cifras">
            <div><strong>{e.productos}</strong><span>Productos</span><small>SKUs distintos</small></div>
            <div><strong>{e.posiciones}</strong><span>Posiciones</span><small>en toda la versión</small></div>
            <div><strong>{e.gondolas} · {e.niveles}</strong><span>Góndolas · niveles</span><small>{e.gondolas === 1 ? '1 góndola' : `${e.gondolas} góndolas`}</small></div>
            <div><strong>{e.metrosLineales.toLocaleString('es-GT')} m</strong><span>Metros lineales</span><small>frente total</small></div>
          </div>

          {e.posiciones > 0 && (
            <section className="version-resumen__modos">
              <div className="version-resumen__subtitulo">
                <span>Posiciones por modo</span>
                <span className="version-resumen__subtitulo-detalle">
                  {e.posicionesPorModo.PENDIENTE > 0
                    ? `${e.posicionesPorModo.PENDIENTE} posiciones sin SKU confirmado`
                    : 'Todas las posiciones tienen SKU'}
                </span>
              </div>
              <div className="version-resumen__barra">
                {MODOS.filter((m) => e.posicionesPorModo[m.id] > 0).map((m) => (
                  <span key={m.id} className={`version-resumen__tramo version-resumen__tramo--${m.id.toLowerCase()}`} style={{ flexGrow: e.posicionesPorModo[m.id] }} />
                ))}
              </div>
              <div className="version-resumen__leyenda">
                {MODOS.filter((m) => m.id !== 'PENDIENTE' || e.posicionesPorModo.PENDIENTE > 0).map((m) => (
                  <span key={m.id}>
                    <span className={`version-resumen__tramo version-resumen__tramo--${m.id.toLowerCase()}`} />
                    {m.etiqueta} <strong>{e.posicionesPorModo[m.id]}</strong>
                  </span>
                ))}
              </div>
            </section>
          )}

          <div className="version-resumen__columnas">
            <section>
              <h3 className="version-resumen__subtitulo">Versión</h3>
              <dl className="version-resumen__datos">
                <dt>Id</dt><dd>{version.id}</dd>
                <dt>Tipo</dt>
                <dd>{esEspecial ? `Especial de ${tienda.codigo}` : `${TIPO_TIENDA_META[version.tipo].label} (${sigla})`}</dd>
                {version.versionBase && (<><dt>Versión base</dt><dd className="mono">{version.versionBase.codigo}</dd></>)}
                {piloto && (
                  <>
                    <dt>Reemplazará a</dt>
                    <dd>{version.reemplazaA ? <span className="mono">{version.reemplazaA.codigo}</span> : `Ninguna: es la primera ${sigla}`}</dd>
                  </>
                )}
                <dt>Creada</dt><dd>{formatearFecha(version.createdAt)}</dd>
                <dt>Última edición</dt><dd>{formatearFecha(version.updatedAt)}</dd>
              </dl>
            </section>
            <section>
              <h3 className="version-resumen__subtitulo">Planograma</h3>
              <dl className="version-resumen__datos">
                <dt>Id</dt><dd>{resumen.planograma.id}</dd>
                <dt>Departamento</dt><dd>{resumen.planograma.departamento}</dd>
                <dt>Estado</dt><dd>{resumen.planograma.estado}</dd>
                <dt>Subcategorías</dt>
                <dd className="version-resumen__subcategorias">
                  {resumen.planograma.subcategorias.length === 0
                    ? '—'
                    : resumen.planograma.subcategorias.map((s) => <span key={s}>{subcategoriaSinCodigo(s)}</span>)}
                </dd>
              </dl>
            </section>
          </div>

          <section>
            <h3 className="version-resumen__subtitulo">Tiendas que usan esta versión · {resumen.tiendas.length}</h3>
            <div className="version-resumen__tiendas">
              {resumen.tiendas.length === 0 && <span className="version-resumen__vacio">Ninguna tienda la tiene montada.</span>}
              {resumen.tiendas.map((t) => (
                <span key={t.id} className={`version-resumen__tienda${t.id === tienda.id ? ' version-resumen__tienda--actual' : ''}`}>
                  <span className="mono">{t.codigo}</span> {t.nombre}
                </span>
              ))}
            </div>
          </section>

          {version.notas && (
            <section>
              <h3 className="version-resumen__subtitulo">Notas de la versión</h3>
              <p className="version-resumen__notas">{version.notas}</p>
            </section>
          )}

          <section>
            <h3 className="version-resumen__subtitulo">Adjuntos · {cargandoAdjuntos ? '…' : adjuntos.length}</h3>
            {!cargandoAdjuntos && adjuntos.length === 0 && <span className="version-resumen__vacio">Esta versión no tiene adjuntos.</span>}
            {adjuntos.length > 0 && (
              <ul className="version-resumen__adjuntos">
                {adjuntos.map((a) => (
                  <li key={a.id}>
                    <span className={`version-resumen__ext${a.tipoMime === 'application/pdf' ? ' version-resumen__ext--pdf' : ''}`}>{extension(a.tipoMime)}</span>
                    <span className="version-resumen__adjunto">
                      <strong>{a.nombreOriginal}</strong>
                      <span>{tamano(a.tamanoBytes)} · {a.subidoPor}</span>
                    </span>
                    <span className="version-resumen__fecha">{formatearFecha(a.createdAt)}</span>
                    <button type="button" className="version-resumen__descargar" aria-label={`Descargar ${a.nombreOriginal}`} title="Descargar" onClick={() => descargar(a)}>
                      ↓
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </Modal>
  );
}
