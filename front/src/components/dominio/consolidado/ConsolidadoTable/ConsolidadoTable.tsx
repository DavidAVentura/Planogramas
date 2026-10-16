import { Fragment, useState, type ReactNode } from 'react';
import { Badge } from '../../../ui/Badge/Badge';
import { EstadoVersionBadge } from '../../implementacion/EstadoVersionBadge/EstadoVersionBadge';
import { DECISION_POSICION_META } from '../../../../constants/implementacion';
import { MODO_APARICION_META } from '../../../../constants/productos';
import {
  columnaConsolidado,
  textoAccesorios,
  textoCelda,
  type ClaveColumnaConsolidado,
} from '../../../../domain/consolidado/columnasConsolidado';
import type { DecisionPosicion } from '../../../../types/posicion';
import type {
  FilaConsolidado,
  GrupoConsolidado,
  OrdenConsolidado,
  VistaConsolidado,
} from '../../../../types/consolidado';
import './ConsolidadoTable.css';

const ANCHO_COLUMNA_INICIAL = 172;
const FILAS_ESQUELETO = 8;

// ─── Celdas ──────────────────────────────────────────────────────────────────

const SIN_DATO = <span className="consolidado-tabla__vacio">—</span>;

function conSecundario(principal: string, secundario: string | undefined, clasePrincipal?: string) {
  return (
    <span className="consolidado-tabla__doble">
      <span className={clasePrincipal} title={principal}>
        {principal}
      </span>
      {secundario && (
        <span className="consolidado-tabla__secundario" title={secundario}>
          {secundario}
        </span>
      )}
    </span>
  );
}

function CeldaMontaje({ fila }: { fila: FilaConsolidado }) {
  const accesorios = textoAccesorios(fila);
  const m = fila.montaje;
  const banderas = [
    m.colganteExterno && { texto: 'Colgante externo', bg: MODO_APARICION_META.CROSS.bg, color: MODO_APARICION_META.CROSS.color },
    m.display && { texto: 'Display', bg: 'var(--cemaco-indigo-100)', color: 'var(--cemaco-indigo)' },
    m.desborda && {
      texto: 'Desborda la góndola',
      bg: 'var(--warning-bg)',
      color: 'var(--warning)',
      titulo: m.notaDesborde ? `Desborda la góndola: ${m.notaDesborde}` : undefined,
    },
  ].filter((b) => b !== false);

  if (!accesorios && banderas.length === 0) return SIN_DATO;
  return (
    <span className="consolidado-tabla__doble">
      {accesorios && (
        <span className="consolidado-tabla__mono" title={accesorios}>
          {accesorios}
        </span>
      )}
      {banderas.length > 0 && (
        <span className="consolidado-tabla__banderas">
          {banderas.map((b) => (
            <span key={b.texto} title={'titulo' in b ? b.titulo : undefined}>
              <Badge bg={b.bg} color={b.color}>
                {b.texto}
              </Badge>
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

function Celda({ clave, fila, grupo }: { clave: ClaveColumnaConsolidado; fila: FilaConsolidado | null; grupo: GrupoConsolidado }): ReactNode {
  const { principal, secundario } = textoCelda(clave, fila, grupo);
  switch (clave) {
    case 'sku':
      return <span className="consolidado-tabla__mono">{principal}</span>;
    case 'producto':
      return conSecundario(principal || 'Sin nombre', secundario, 'consolidado-tabla__fuerte');
    case 'tienda':
      return conSecundario(principal, secundario);
    case 'version':
      if (!fila) return <span className="consolidado-tabla__sin-planograma">Sin planograma</span>;
      return conSecundario(principal, secundario, 'consolidado-tabla__mono');
    case 'estadoVersion':
      return fila ? <EstadoVersionBadge estado={fila.estadoVersion} /> : null;
    case 'montaje':
      return fila ? <CeldaMontaje fila={fila} /> : null;
    case 'modo': {
      if (!fila) return null;
      const meta = MODO_APARICION_META[fila.modo];
      return <Badge bg={meta.bg} color={meta.color}>{meta.label}</Badge>;
    }
    case 'decision': {
      const meta = fila?.decision ? DECISION_POSICION_META[fila.decision as DecisionPosicion] : undefined;
      if (!meta) return principal ? principal : fila ? SIN_DATO : null;
      return <Badge bg={meta.bg} color={meta.color}>{meta.label}</Badge>;
    }
    case 'observaciones':
      return principal ? <span className="consolidado-tabla__observaciones">{principal}</span> : fila ? SIN_DATO : null;
    default:
      if (!principal) return fila || clave === 'sustituto' ? SIN_DATO : null;
      return secundario ? conSecundario(principal, secundario) : <span className="consolidado-tabla__texto" title={principal}>{principal}</span>;
  }
}

// ─── Encabezado ──────────────────────────────────────────────────────────────

function IconoOrden({ dir }: { dir: 'asc' | 'desc' | null }) {
  const trazo = dir === 'asc' ? 'M12 19V5M6 11l6-6 6 6' : dir === 'desc' ? 'M12 5v14M6 13l6 6 6-6' : 'M8 9l4-4 4 4M8 15l4 4 4-4';
  return (
    <svg
      className={dir ? undefined : 'consolidado-tabla__icono-inactivo'}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={trazo} />
    </svg>
  );
}

function Chevron({ abierto }: { abierto: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={abierto ? 'M6 9l6 6 6-6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}

// ─── Tabla ───────────────────────────────────────────────────────────────────

interface ConsolidadoTableProps {
  grupos: GrupoConsolidado[];
  vista: VistaConsolidado;
  columnas: ClaveColumnaConsolidado[];
  orden: OrdenConsolidado;
  direccion: 'asc' | 'desc';
  onOrdenar: (orden: OrdenConsolidado) => void;
  cargando: boolean;
  /** Modo extendido: menos relleno vertical en las celdas. */
  compacta: boolean;
}

const claveGrupo = (g: GrupoConsolidado) => `${g.sku}|${g.tienda.id}`;
const idSubfilas = (g: GrupoConsolidado) => `consolidado-sub-${g.sku}-${g.tienda.id}`;
const claveFila = (f: FilaConsolidado) => `${f.versionId}-${f.modo}`;

/**
 * Tabla del consolidado: una fila por SKU–tienda–versión de planograma; las apariciones como cross
 * e impulso del mismo SKU en la tienda salen como sub-filas que se despliegan con el chevron. En
 * las vistas Solo cross / Solo impulso cada aparición es una fila principal. Un SKU en más de un
 * planograma de la tienda se marca en rojo (el conteo viene del servidor, sin depender de los filtros).
 */
export function ConsolidadoTable({ grupos, vista, columnas, orden, direccion, onOrdenar, cargando, compacta }: ConsolidadoTableProps) {
  // La expansión se descarta sola al cambiar de página o de filtros: pertenece a esta lista de grupos.
  const [expansion, setExpansion] = useState<{ grupos: GrupoConsolidado[]; abiertos: ReadonlySet<string> }>({
    grupos,
    abiertos: new Set(),
  });
  const abiertos = expansion.grupos === grupos ? expansion.abiertos : new Set<string>();

  const definiciones = columnas.map(columnaConsolidado);
  const anchoTotal = ANCHO_COLUMNA_INICIAL + definiciones.reduce((suma, c) => suma + c.ancho, 0);
  const modoPlanograma = vista === 'PLANOGRAMA';

  function alternar(g: GrupoConsolidado) {
    const nuevos = new Set(abiertos);
    if (!nuevos.delete(claveGrupo(g))) nuevos.add(claveGrupo(g));
    setExpansion({ grupos, abiertos: nuevos });
  }

  function celdas(fila: FilaConsolidado | null, g: GrupoConsolidado) {
    return definiciones.map((col) => (
      <td key={col.clave} className={col.numerica ? 'consolidado-tabla__celda--numero' : undefined}>
        <Celda clave={col.clave} fila={fila} grupo={g} />
      </td>
    ));
  }

  function filaSub(f: FilaConsolidado, g: GrupoConsolidado) {
    const meta = MODO_APARICION_META[f.modo];
    return (
      <tr key={claveFila(f)} className="consolidado-tabla__fila consolidado-tabla__fila--sub">
        <td className="consolidado-tabla__inicio consolidado-tabla__inicio--sub">
          <Badge bg={meta.bg} color={meta.color}>{meta.label}</Badge>
        </td>
        {celdas(f, g)}
      </tr>
    );
  }

  return (
    <div className={`consolidado-tabla__scroll${compacta ? ' consolidado-tabla__scroll--compacta' : ''}`}>
      <table className="consolidado-tabla" aria-label="Consolidado de tiendas" aria-busy={cargando} style={{ width: `max(${anchoTotal}px, 100%)` }}>
        <colgroup>
          <col style={{ width: ANCHO_COLUMNA_INICIAL }} />
          {definiciones.map((c, i) => (
            // La última columna toma el espacio que sobre (nunca menos que su ancho).
            <col key={c.clave} style={i === definiciones.length - 1 ? undefined : { width: c.ancho }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" className="consolidado-tabla__encabezado consolidado-tabla__encabezado--inicio">
              <span className="consolidado-tabla__oculto">{modoPlanograma ? 'Apariciones' : 'Tipo de aparición'}</span>
            </th>
            {definiciones.map((col) => {
              const activa = col.ordenable !== null && col.ordenable === orden;
              const siguiente = activa && direccion === 'asc' ? 'Z a A' : 'A a Z';
              return (
                <th
                  key={col.clave}
                  scope="col"
                  aria-sort={col.ordenable ? (activa ? (direccion === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                  className={`consolidado-tabla__encabezado${col.numerica ? ' consolidado-tabla__celda--numero' : ''}`}
                >
                  {col.ordenable ? (
                    <button
                      type="button"
                      className={`consolidado-tabla__orden${activa ? ' consolidado-tabla__orden--activo' : ''}`}
                      title={`Ordenar por ${col.etiqueta.toLowerCase()} de ${siguiente}`}
                      onClick={() => onOrdenar(col.ordenable!)}
                    >
                      <span>{col.etiqueta.toUpperCase()}</span>
                      <IconoOrden dir={activa ? direccion : null} />
                    </button>
                  ) : (
                    <span className="consolidado-tabla__titulo">{col.etiqueta.toUpperCase()}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        {cargando
          ? (
            <tbody>
              {Array.from({ length: FILAS_ESQUELETO }, (_, i) => (
                <tr key={i} className="consolidado-tabla__fila" aria-hidden="true">
                  <td className="consolidado-tabla__inicio" />
                  {definiciones.map((col) => (
                    <td key={col.clave}>
                      <span className="consolidado-tabla__esqueleto" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )
          : grupos.map((g) => {
            const duplicado = modoPlanograma && g.planogramasEnTienda > 1;
            const abierto = modoPlanograma && abiertos.has(claveGrupo(g));
            const principales: (FilaConsolidado | null)[] = modoPlanograma ? (g.planograma.length > 0 ? g.planograma : [null]) : g.otras;
            const ayuda = `${abierto ? 'Ocultar' : 'Ver'} apariciones cross e impulso de ${g.producto.nombre ?? g.sku} en ${g.tienda.nombre}`;
            const aviso = `Este SKU está en ${g.planogramasEnTienda} planogramas distintos en esta tienda; los filtros dejan ver ${g.planograma.length}`;
            const claseGrupo = duplicado ? ' consolidado-tabla__grupo--duplicado' : '';
            return (
              <Fragment key={claveGrupo(g)}>
                <tbody className={`consolidado-tabla__grupo${claseGrupo}`}>
                  {principales.map((f) => {
                    const meta = f && !modoPlanograma ? MODO_APARICION_META[f.modo] : null;
                    return (
                      <tr key={f ? claveFila(f) : 'sin-planograma'} className="consolidado-tabla__fila">
                        <td className="consolidado-tabla__inicio">
                          {modoPlanograma && (
                            <button
                              type="button"
                              className="consolidado-tabla__chevron"
                              aria-expanded={abierto}
                              aria-controls={idSubfilas(g)}
                              aria-label={ayuda}
                              onClick={() => alternar(g)}
                            >
                              <Chevron abierto={abierto} />
                            </button>
                          )}
                          {duplicado && (
                            <span className="consolidado-tabla__dup" title={aviso}>
                              {g.planogramasEnTienda} planogramas
                            </span>
                          )}
                          {meta && <Badge bg={meta.bg} color={meta.color}>{meta.label}</Badge>}
                        </td>
                        {celdas(f, g)}
                      </tr>
                    );
                  })}
                </tbody>
                {modoPlanograma && (
                  <tbody id={idSubfilas(g)} className={`consolidado-tabla__grupo${claseGrupo}`} hidden={!abierto}>
                    {abierto && g.otras.map((f) => filaSub(f, g))}
                    {abierto && g.otras.length === 0 && (
                      <tr className="consolidado-tabla__fila consolidado-tabla__fila--sub">
                        <td colSpan={definiciones.length + 1} className="consolidado-tabla__sin-subfilas">
                          Sin apariciones cross ni impulso en esta tienda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                )}
              </Fragment>
            );
          })}
      </table>
    </div>
  );
}
