import { SIGLA_TIPO_TIENDA } from '../../../../constants/tiendas';
import type { VersionMatriz } from '../../../../types/asignacion';
import type { VersionTipo } from '../../../../types/version';
import './VersionesPlanograma.css';

const TIPOS_BASE: VersionTipo[] = ['GRANDE', 'MEDIANA', 'EXPRESS'];

/**
 * Cuadritos de las versiones de un planograma: TG/TM/TE publicadas (tachada si falta), el número de
 * especiales publicadas y las líneas base en piloto. Se usa en la matriz de Estructura y en su
 * selector de planogramas.
 */
export function VersionesPlanograma({ versiones }: { versiones: VersionMatriz[] }) {
  const bases = versiones.filter((v) => v.versionBaseId === null);
  const especiales = versiones.filter((v) => v.versionBaseId !== null && v.estado === 'publicado').length;
  return (
    <span className="versiones-planograma">
      {TIPOS_BASE.map((tipo) => {
        const hay = bases.some((v) => v.tipo === tipo && v.estado === 'publicado');
        return (
          <span
            key={tipo}
            className={`versiones-planograma__sigla versiones-planograma__sigla--${hay ? SIGLA_TIPO_TIENDA[tipo].toLowerCase() : 'falta'}`}
            title={hay ? `Versión ${SIGLA_TIPO_TIENDA[tipo]} publicada` : `Sin versión ${SIGLA_TIPO_TIENDA[tipo]} publicada`}
          >
            {SIGLA_TIPO_TIENDA[tipo]}
          </span>
        );
      })}
      {especiales > 0 && (
        <span className="versiones-planograma__sigla versiones-planograma__sigla--esp" title="Versiones especiales publicadas">
          {especiales} esp.
        </span>
      )}
      {bases
        .filter((v) => v.estado === 'piloto')
        .map((v) => (
          <span key={v.id} className="versiones-planograma__sigla versiones-planograma__sigla--piloto" title={`Versión ${SIGLA_TIPO_TIENDA[v.tipo]} en piloto`}>
            {SIGLA_TIPO_TIENDA[v.tipo]} piloto
          </span>
        ))}
    </span>
  );
}
