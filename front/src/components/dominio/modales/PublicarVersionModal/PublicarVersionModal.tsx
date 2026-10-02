import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { ChipVersion } from '../../estructura/ChipVersion/ChipVersion';
import { SIGLA_TIPO_TIENDA, TIPO_TIENDA_META } from '../../../../constants/tiendas';
import { usePublicarVersion, useSimulacionPublicacion } from '../../../../hooks/useVersiones';
import type { VarianteChip } from '../../../../domain/estructura/asignaciones';
import type { PromoverAPublicadoResultado, TiendaConTipo, VersionListItem } from '../../../../types/version';
import '../ResumenAsignacionModal/ResumenAsignacionModal.css';
import './PublicarVersionModal.css';

interface PublicarVersionModalProps {
  planogramaId: number;
  version: VersionListItem;
  onClose: () => void;
  onPublicada: (version: PromoverAPublicadoResultado) => void;
}

interface Seccion {
  id: 'piloto' | 'migran';
  titulo: string;
  implicacion: string;
  tiendas: TiendaConTipo[];
  antes: { texto: string; variante: VarianteChip };
}

function tiendasTexto(n: number): string {
  return n === 1 ? '1 tienda' : `${n} tiendas`;
}

/**
 * Revisión antes de publicar una versión en piloto. La simulación del backend dice qué tiendas la
 * quedan publicada (las del piloto) y cuáles migran desde la publicada anterior, que se archiva.
 * Con errores bloqueantes solo se listan y no se ofrece publicar.
 */
export function PublicarVersionModal({ planogramaId, version, onClose, onPublicada }: PublicarVersionModalProps) {
  const { simulacion, cargando } = useSimulacionPublicacion(version.id);
  const { publicar, enviando } = usePublicarVersion();
  const [motivo, setMotivo] = useState('');

  const sigla = SIGLA_TIPO_TIENDA[version.tipo];
  const variante = sigla.toLowerCase() as VarianteChip;
  const rutaEditor = `/planogramas/${planogramaId}/versiones/${version.id}/editor`;
  const errores = simulacion?.erroresBloqueantes ?? [];
  const bloqueada = errores.length > 0;
  const anterior = simulacion?.versionAnterior ?? null;
  const total = simulacion?.totalTiendas ?? 0;

  async function confirmar() {
    const resultado = await publicar(version.id, motivo, total);
    if (resultado.version) onPublicada(resultado.version);
  }

  const secciones: Seccion[] = simulacion
    ? [
        {
          id: 'piloto' as const,
          titulo: 'Tiendas piloto que se actualizan a publicado',
          implicacion: 'Siguen con el mismo planograma; solo cambia el estado de piloto a publicado.',
          tiendas: simulacion.tiendasPiloto,
          antes: { texto: `Piloto ${sigla}`, variante: 'piloto' as const },
        },
        {
          id: 'migran' as const,
          titulo: 'Tiendas de la versión anterior que se actualizarán a la nueva',
          implicacion: anterior
            ? `Hoy usan ${anterior.codigo}; quedan pendientes de migrar a ${version.codigo} y deben remontar el mueble.`
            : '',
          tiendas: simulacion.tiendasMigran,
          antes: { texto: anterior?.codigo ?? sigla, variante },
        },
      ].filter((s) => s.tiendas.length > 0)
    : [];
  const distintas = simulacion ? [...simulacion.tiendasPiloto, ...simulacion.tiendasMigran].filter((t) => t.tipo !== version.tipo) : [];

  const subtitulo = !simulacion
    ? ''
    : bloqueada
      ? 'La validación encontró posiciones que impiden publicar.'
      : simulacion.esEspecial
        ? 'Es una versión especial: solo cambia su tienda y no archiva ninguna otra versión.'
        : anterior
          ? `Validación sin errores. Queda en ${tiendasTexto(total)}: ${simulacion.tiendasPiloto.length} del piloto y ${simulacion.tiendasMigran.length} que hoy usan ${anterior.codigo}.`
          : `Validación sin errores. Queda en ${tiendasTexto(total)}, las del piloto.`;

  return (
    <Modal
      titulo={`Publicar ${version.codigo}`}
      ancho="lg"
      claseModal="resumen-asignacion publicar-version"
      onClose={enviando ? () => {} : onClose}
      footer={
        bloqueada ? (
          <>
            <Button variante="ghost" onClick={onClose}>
              Cerrar
            </Button>
            <Link className="button button--primary" to={rutaEditor}>
              Abrir en el editor
            </Link>
          </>
        ) : (
          <>
            <Button variante="ghost" onClick={onClose} disabled={enviando}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={enviando || cargando || !simulacion}>
              {enviando ? 'Publicando…' : `Publicar en ${tiendasTexto(total)}`}
            </Button>
          </>
        )
      }
    >
      {cargando && <p className="resumen-asignacion__resumen">Calculando el impacto en las tiendas…</p>}

      {simulacion && <p className="resumen-asignacion__resumen">{subtitulo}</p>}

      {bloqueada && (
        <>
          <div className="publicar-version__bloqueo" role="alert">
            <strong>{errores.length === 1 ? '1 error bloqueante.' : `${errores.length} errores bloqueantes.`}</strong> Corrígelos
            en el editor y vuelve a intentar; hasta entonces las tiendas siguen con la versión piloto.
          </div>
          <ul className="resumen-asignacion__lista">
            {errores.map((e) => (
              <li key={e.posicionId} className="publicar-version__error">
                <span>
                  <strong>
                    {e.gondola} · nivel {e.nivel}
                  </strong>{' '}
                  · SKU <span className="mono">{e.sku}</span>
                </span>
                <span className="publicar-version__error-detalle">{e.error}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {simulacion && !bloqueada && (
        <>
          <div className="publicar-version__conteos">
            <div className="resumen-asignacion__conteo resumen-asignacion__conteo--piloto-entra">
              <span className="resumen-asignacion__conteo-numero">{simulacion.tiendasPiloto.length}</span>
              <span className="resumen-asignacion__conteo-texto">tiendas piloto se actualizan a publicado</span>
            </div>
            <div className={`resumen-asignacion__conteo${simulacion.tiendasMigran.length ? ' resumen-asignacion__conteo--cambio' : ''}`}>
              <span className="resumen-asignacion__conteo-numero">{simulacion.tiendasMigran.length}</span>
              <span className="resumen-asignacion__conteo-texto">tiendas de la versión anterior se actualizarán a la nueva</span>
            </div>
            <div className="resumen-asignacion__conteo publicar-version__archiva">
              <span className="publicar-version__archiva-codigo mono">{anterior ? anterior.codigo : 'Ninguna'}</span>
              <span className="resumen-asignacion__conteo-texto">
                {anterior ? 'se archiva al publicar' : `versión ${sigla} publicada que archivar`}
              </span>
            </div>
          </div>

          {distintas.length > 0 && (
            <div className="resumen-asignacion__aviso" role="note">
              <strong>
                {distintas.length === 1
                  ? `${distintas[0].nombre} es de tipo ${TIPO_TIENDA_META[distintas[0].tipo].label.toLowerCase()}.`
                  : `${distintas.length} tiendas son de un tipo distinto al de la versión.`}
              </strong>{' '}
              Se publica igual; verifica que su mueble tenga espacio para esta versión.
            </div>
          )}

          <div className="resumen-asignacion__grupos">
            {secciones.map((s) => (
              <section key={s.id} className="resumen-asignacion__grupo">
                <h3 className={`resumen-asignacion__titulo resumen-asignacion__titulo--${s.id === 'piloto' ? 'piloto-entra' : 'cambio'}`}>
                  {s.titulo} <span>{s.tiendas.length}</span>
                </h3>
                <p className="resumen-asignacion__implicacion">{s.implicacion}</p>
                <ul className="resumen-asignacion__lista">
                  {s.tiendas.map((t) => (
                    <li key={t.id} className="resumen-asignacion__item">
                      <span className="resumen-asignacion__tienda">
                        <span className="mono">{t.codigo}</span> {t.nombre}
                      </span>
                      <span className="publicar-version__tipo">{TIPO_TIENDA_META[t.tipo].label}</span>
                      <span className="resumen-asignacion__transicion">
                        <ChipVersion texto={s.antes.texto} variante={s.antes.variante} />
                        <span aria-label="pasa a">→</span>
                        <ChipVersion texto={s.id === 'piloto' ? sigla : version.codigo} variante={variante} />
                        {t.tipo !== version.tipo && (
                          <span className="resumen-asignacion__distinta" title="Tienda de un tipo distinto al de la versión">
                            !
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <label className="resumen-asignacion__motivo">
            <span>
              Motivo de la publicación <span className="resumen-asignacion__opcional">(opcional, queda en el historial)</span>
            </span>
            <textarea
              rows={2}
              maxLength={500}
              value={motivo}
              placeholder="Ej. Piloto aprobado en Pradera y Oakland"
              onChange={(e) => setMotivo(e.target.value)}
            />
          </label>
        </>
      )}
    </Modal>
  );
}
