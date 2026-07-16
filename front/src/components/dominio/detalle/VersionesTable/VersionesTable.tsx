import { Table, type TableColumn } from '../../../ui/Table/Table';
import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import { EstadoBadge } from '../../EstadoBadge/EstadoBadge';
import type { VersionResumen } from '../../../../types/planograma';

export function VersionesTable({ versiones }: { versiones: VersionResumen[] }) {
  const columnas: TableColumn<VersionResumen>[] = [
    { key: 'codigo', header: 'Código', render: (v) => <span className="mono">{v.codigo}</span> },
    { key: 'tipo', header: 'Tipo', render: (v) => v.tipo },
    { key: 'estado', header: 'Estado', render: (v) => <EstadoBadge estado={v.estado} /> },
    { key: 'tiendas', header: 'Tiendas', render: (v) => v.totalTiendas },
  ];

  return (
    <Table
      columns={columnas}
      rows={versiones}
      rowKey={(v) => v.id}
      vacio={<EmptyState titulo="Este planograma todavía no tiene versiones" />}
    />
  );
}
