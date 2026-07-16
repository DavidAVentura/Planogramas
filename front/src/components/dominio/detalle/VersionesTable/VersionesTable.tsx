import { Table, type TableColumn } from '../../../ui/Table/Table';
import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import { EstadoBadge } from '../../EstadoBadge/EstadoBadge';
import type { VersionListItem } from '../../../../types/version';
import './VersionesTable.css';

interface VersionesTableProps {
  versiones: VersionListItem[];
  puedeEscribir: boolean;
  onMarcarEnDesarrollo: (v: VersionListItem) => void;
  onPromoverPiloto: (v: VersionListItem) => void;
  onTiendas: (v: VersionListItem) => void;
  onPublicar: (v: VersionListItem) => void;
}

export function VersionesTable({
  versiones,
  puedeEscribir,
  onMarcarEnDesarrollo,
  onPromoverPiloto,
  onTiendas,
  onPublicar,
}: VersionesTableProps) {
  const columnas: TableColumn<VersionListItem>[] = [
    { key: 'codigo', header: 'Código', render: (v) => <span className="mono">{v.codigo}</span> },
    { key: 'tipo', header: 'Tipo', render: (v) => v.tipo },
    { key: 'estado', header: 'Estado', render: (v) => <EstadoBadge estado={v.estado} /> },
    { key: 'gondolas', header: 'Góndolas', render: (v) => v.totalGondolas },
    { key: 'tiendas', header: 'Tiendas', render: (v) => v.tiendas.length },
  ];

  if (puedeEscribir) {
    columnas.push({
      key: 'acciones',
      header: 'Acciones',
      render: (v) => (
        <span className="versiones-table__acciones">
          {v.estado === 'borrador' && (
            <button type="button" onClick={() => onMarcarEnDesarrollo(v)}>
              Marcar en desarrollo
            </button>
          )}
          {v.estado === 'en_desarrollo' && (
            <button type="button" onClick={() => onPromoverPiloto(v)}>
              Promover a piloto
            </button>
          )}
          {v.estado === 'piloto' && (
            <>
              <button type="button" onClick={() => onTiendas(v)}>
                Tiendas piloto
              </button>
              <button type="button" onClick={() => onPublicar(v)}>
                Publicar
              </button>
            </>
          )}
          {v.estado === 'publicado' && (
            <button type="button" onClick={() => onTiendas(v)}>
              Tiendas asignadas
            </button>
          )}
        </span>
      ),
    });
  }

  return (
    <Table
      columns={columnas}
      rows={versiones}
      rowKey={(v) => v.id}
      vacio={<EmptyState titulo="Este planograma todavía no tiene versiones" />}
    />
  );
}
