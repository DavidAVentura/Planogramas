import { Link } from 'react-router-dom';
import { Table, type TableColumn } from '../../../ui/Table/Table';
import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import { EstadoBadge } from '../../EstadoBadge/EstadoBadge';
import { rutaEstructura } from '../../../../domain/estructura/contexto';
import type { VersionListItem } from '../../../../types/version';
import './VersionesTable.css';

interface VersionesTableProps {
  planogramaId: number;
  versiones: VersionListItem[];
  puedeEscribir: boolean;
  onMarcarEnDesarrollo: (v: VersionListItem) => void;
  onPublicar: (v: VersionListItem) => void;
  onArchivar: (v: VersionListItem) => void;
  /** Abre el modal de "¿Editor o Lienzo?". */
  onDisenar: (v: VersionListItem) => void;
  onAdjuntos: (v: VersionListItem) => void;
}

function tiendasTexto(n: number): string {
  return n === 1 ? '1 tienda' : `${n} tiendas`;
}

/**
 * Versiones del planograma. Las tiendas se asignan en Estructura: "Promover a piloto" y el conteo de
 * tiendas llevan allá ya filtrado al planograma (en modo piloto cuando aplica). "Publicar" abre la
 * revisión de impacto en el propio detalle.
 */
export function VersionesTable({
  planogramaId,
  versiones,
  puedeEscribir,
  onMarcarEnDesarrollo,
  onPublicar,
  onArchivar,
  onDisenar,
  onAdjuntos,
}: VersionesTableProps) {
  const columnas: TableColumn<VersionListItem>[] = [
    {
      key: 'codigo',
      header: 'Código',
      render: (v) => (
        <Link className="mono versiones-table__codigo" to={`/planogramas/${planogramaId}/versiones/${v.id}/editor`} title="Abrir en el editor">
          {v.codigo}
        </Link>
      ),
    },
    { key: 'tipo', header: 'Tipo', render: (v) => <span className="versiones-table__tipo">{v.tipo}</span> },
    { key: 'estado', header: 'Estado', render: (v) => <EstadoBadge estado={v.estado} /> },
    { key: 'gondolas', header: 'Góndolas', alinear: 'right', render: (v) => <span className="versiones-table__numero">{v.totalGondolas}</span> },
    {
      key: 'tiendas',
      header: 'Tiendas',
      alinear: 'right',
      render: (v) => {
        const n = v.tiendas.length;
        if (n === 0) return <span className="versiones-table__numero versiones-table__numero--cero">0</span>;
        const piloto = v.estado === 'piloto';
        return (
          <Link
            className="versiones-table__conteo"
            to={piloto ? rutaEstructura({ planogramaId, versionId: v.id, modo: 'piloto' }) : rutaEstructura({ planogramaId })}
            title={piloto ? `Ajustar las ${tiendasTexto(n)} piloto en Estructura` : `Ver las ${tiendasTexto(n)} en Estructura`}
          >
            {n}
          </Link>
        );
      },
    },
  ];

  // "Ver productos" es de lectura: se muestra aunque el usuario no pueda editar la versión.
  columnas.push({
    key: 'acciones',
    header: 'Acciones',
    alinear: 'right',
    render: (v) => {
      const sinTiendasPiloto = v.estado === 'piloto' && v.tiendas.length === 0;
      const archivable = v.estado !== 'publicado' && v.estado !== 'archivado';
      return (
        <span className="versiones-table__acciones">
          <Link
            className="versiones-table__accion versiones-table__accion--enlace"
            to={`/por-version?versiones=${v.id}`}
            title="Ver los productos de la versión en Por versión"
          >
            Ver productos
          </Link>
          {puedeEscribir && (
            <>
              {v.estado === 'borrador' && (
                <button type="button" className="versiones-table__estado" onClick={() => onMarcarEnDesarrollo(v)}>
                  Marcar en desarrollo
                </button>
              )}
              {v.estado === 'en_desarrollo' && (
                <Link
                  className="versiones-table__estado"
                  to={rutaEstructura({ planogramaId, versionId: v.id, modo: 'promover' })}
                  title="Elegir en Estructura las tiendas donde se probará"
                >
                  Promover a piloto
                  <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              )}
              {v.estado === 'piloto' && (
                <button
                  type="button"
                  className="versiones-table__estado"
                  disabled={sinTiendasPiloto}
                  title={sinTiendasPiloto ? 'Asigna al menos una tienda piloto antes de publicar' : 'Revisar el impacto y publicar'}
                  onClick={() => onPublicar(v)}
                >
                  Publicar
                </button>
              )}
              <button type="button" className="versiones-table__accion" onClick={() => onDisenar(v)}>
                Diseñar
              </button>
              <button type="button" className="versiones-table__accion" onClick={() => onAdjuntos(v)}>
                Adjuntos
              </button>
              <button
                type="button"
                className="versiones-table__accion versiones-table__accion--peligro"
                disabled={!archivable}
                title={v.estado === 'publicado' ? 'Una versión publicada no se puede archivar' : 'Archivar versión'}
                onClick={() => onArchivar(v)}
              >
                Archivar
              </button>
            </>
          )}
        </span>
      );
    },
  });

  return (
    <Table
      columns={columnas}
      rows={versiones}
      rowKey={(v) => v.id}
      vacio={<EmptyState titulo="Este planograma todavía no tiene versiones" />}
    />
  );
}
