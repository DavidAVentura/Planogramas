import { useNavigate } from 'react-router-dom';
import { Table, type TableColumn } from '../../../ui/Table/Table';
import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import { EstadoBadge } from '../../EstadoBadge/EstadoBadge';
import { formatearFecha } from '../../../../utils/formatters';
import type { PlanogramaListItem } from '../../../../types/planograma';
import './PlanogramasTable.css';

interface PlanogramasTableProps {
  rows: PlanogramaListItem[];
  puedeEscribir: boolean;
  onEditar: (row: PlanogramaListItem) => void;
  onArchivar: (row: PlanogramaListItem) => void;
}

export function PlanogramasTable({ rows, puedeEscribir, onEditar, onArchivar }: PlanogramasTableProps) {
  const navigate = useNavigate();

  const columnas: TableColumn<PlanogramaListItem>[] = [
    { key: 'nombre', header: 'Nombre', render: (r) => r.nombre },
    { key: 'departamento', header: 'Departamento', render: (r) => r.departamento },
    { key: 'estado', header: 'Estado', render: (r) => <EstadoBadge estado={r.estado} /> },
    { key: 'versiones', header: 'Versiones', render: (r) => r.totalVersiones },
    { key: 'creado', header: 'Creado', render: (r) => formatearFecha(r.created_at) },
  ];

  if (puedeEscribir) {
    columnas.push({
      key: 'acciones',
      header: 'Acciones',
      render: (r) => (
        <span className="planogramas-table__acciones" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => onEditar(r)}>
            Editar
          </button>
          <button type="button" disabled={r.estado === 'archivado'} onClick={() => onArchivar(r)}>
            Archivar
          </button>
        </span>
      ),
    });
  }

  return (
    <Table
      columns={columnas}
      rows={rows}
      rowKey={(r) => r.id}
      onRowClick={(r) => navigate(`/planogramas/${r.id}`)}
      vacio={<EmptyState titulo="No se encontraron planogramas" hint="Probá ajustar los filtros o crear uno nuevo." />}
    />
  );
}
