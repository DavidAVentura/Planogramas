import { useNavigate } from 'react-router-dom';
import { Table, type TableColumn } from '../../../ui/Table/Table';
import { EmptyState } from '../../../ui/EmptyState/EmptyState';
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
    { key: 'departamento', header: 'Departamento', render: (r) => r.departamento },
    { key: 'nombre', header: 'Nombre', render: (r) => <span className="planogramas-table__nombre">{r.nombre}</span> },
    {
      key: 'versiones',
      header: 'Versiones',
      alinear: 'right',
      render: (r) => <span className="planogramas-table__numero">{r.totalVersiones}</span>,
    },
    { key: 'creado', header: 'Creado', render: (r) => formatearFecha(r.created_at) },
  ];

  if (puedeEscribir) {
    columnas.push({
      key: 'acciones',
      header: 'Acciones',
      alinear: 'right',
      render: (r) => (
        <span className="planogramas-table__acciones" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => onEditar(r)}>
            Editar
          </button>
          <button
            type="button"
            className="planogramas-table__accion--peligro"
            disabled={r.estado === 'archivado'}
            onClick={() => onArchivar(r)}
          >
            Archivar
          </button>
        </span>
      ),
    });
  }

  return (
    <div className="planogramas-table">
      <Table
        columns={columnas}
        rows={rows}
        rowKey={(r) => r.id}
        // Sin columna de estado: un archivado se distingue por el texto atenuado (y "Archivar" deshabilitado).
        rowClassName={(r) => (r.estado === 'archivado' ? 'planogramas-table__fila--archivada' : undefined)}
        onRowClick={(r) => navigate(`/planogramas/${r.id}`)}
        vacio={<EmptyState titulo="No se encontraron planogramas" hint="Probá ajustar los filtros o crear uno nuevo." />}
      />
    </div>
  );
}
