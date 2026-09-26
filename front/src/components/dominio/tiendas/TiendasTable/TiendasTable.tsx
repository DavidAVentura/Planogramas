import type { ReactNode } from 'react';
import { Table, type TableColumn } from '../../../ui/Table/Table';
import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import { Badge } from '../../../ui/Badge/Badge';
import { ESTADO_TIENDA_META, TIPO_TIENDA_META } from '../../../../constants/tiendas';
import type { CampoOrdenTienda, CriterioOrden } from '../../../../domain/tiendas/ordenTiendas';
import type { Tienda } from '../../../../types/tienda';
import './TiendasTable.css';

interface ColumnaOrdenable {
  campo: CampoOrdenTienda;
  header: string;
  alinear?: 'left' | 'right';
  render: (t: Tienda) => ReactNode;
}

const COLUMNAS: ColumnaOrdenable[] = [
  { campo: 'codigo', header: 'Código', render: (t) => <span className="tiendas-table__codigo">{t.codigo}</span> },
  { campo: 'nombre', header: 'Nombre', render: (t) => <span className="tiendas-table__nombre">{t.nombre}</span> },
  {
    campo: 'tipo',
    header: 'Tipo',
    render: (t) => (
      <Badge bg={TIPO_TIENDA_META[t.tipo].bg} color={TIPO_TIENDA_META[t.tipo].color}>
        {TIPO_TIENDA_META[t.tipo].label}
      </Badge>
    ),
  },
  { campo: 'marca', header: 'Marca', render: (t) => t.marca ?? '—' },
  { campo: 'planogramas', header: 'Planogramas', alinear: 'right', render: (t) => t.planogramas },
  {
    campo: 'estado',
    header: 'Estado',
    render: (t) => (
      <Badge bg={ESTADO_TIENDA_META[t.estado].bg} color={ESTADO_TIENDA_META[t.estado].color}>
        {ESTADO_TIENDA_META[t.estado].label}
      </Badge>
    ),
  },
];

interface TiendasTableProps {
  rows: Tienda[];
  orden: CriterioOrden[];
  puedeEscribir: boolean;
  onOrdenar: (campo: CampoOrdenTienda) => void;
  onEditar: (tienda: Tienda) => void;
  onDesactivar: (tienda: Tienda) => void;
  onReactivar: (tienda: Tienda) => void;
}

export function TiendasTable({
  rows,
  orden,
  puedeEscribir,
  onOrdenar,
  onEditar,
  onDesactivar,
  onReactivar,
}: TiendasTableProps) {
  const variosCriterios = orden.length > 1;

  const columnas: TableColumn<Tienda>[] = COLUMNAS.map((col) => {
    const indice = orden.findIndex((o) => o.campo === col.campo);
    const criterio = indice >= 0 ? orden[indice] : null;
    const principal = indice === 0;
    const siguiente = principal && criterio?.dir === 'asc' ? 'mayor a menor' : 'menor a mayor';

    return {
      key: col.campo,
      header: col.header,
      alinear: col.alinear,
      ariaSort: principal ? (criterio?.dir === 'asc' ? 'ascending' : 'descending') : 'none',
      headerContent: (
        <button
          type="button"
          className={[
            'tiendas-table__orden',
            principal && 'tiendas-table__orden--principal',
            indice > 0 && 'tiendas-table__orden--secundario',
          ]
            .filter(Boolean)
            .join(' ')}
          title={`Ordenar por ${col.header.toLowerCase()} de ${siguiente}`}
          onClick={() => onOrdenar(col.campo)}
        >
          {col.header}
          <IconoOrden dir={criterio?.dir ?? null} />
          {variosCriterios && criterio && (
            <span className="tiendas-table__prioridad" aria-hidden="true">
              {indice + 1}
            </span>
          )}
        </button>
      ),
      render: col.render,
    };
  });

  if (puedeEscribir) {
    columnas.push({
      key: 'acciones',
      header: 'Acciones',
      alinear: 'right',
      render: (t) => (
        <span className="tiendas-table__acciones">
          <button type="button" onClick={() => onEditar(t)}>
            Editar
          </button>
          {t.estado === 'activo' ? (
            <button type="button" className="tiendas-table__accion--peligro" onClick={() => onDesactivar(t)}>
              Desactivar
            </button>
          ) : (
            <button type="button" className="tiendas-table__accion--exito" onClick={() => onReactivar(t)}>
              Reactivar
            </button>
          )}
        </span>
      ),
    });
  }

  return (
    <Table
      columns={columnas}
      rows={rows}
      rowKey={(t) => t.id}
      rowClassName={(t) => (t.estado === 'inactivo' ? 'tiendas-table__fila--inactiva' : undefined)}
      vacio={
        <EmptyState
          titulo="No hay tiendas con esos filtros"
          hint="Ajusta la búsqueda o el estado para ver más resultados."
        />
      }
    />
  );
}

function IconoOrden({ dir }: { dir: 'asc' | 'desc' | null }) {
  const trazo = dir === 'asc' ? 'M12 19V5M6 11l6-6 6 6' : dir === 'desc' ? 'M12 5v14M6 13l6 6 6-6' : 'M8 9l4-4 4 4M8 15l4 4 4-4';
  return (
    <svg
      className={dir ? 'tiendas-table__icono' : 'tiendas-table__icono tiendas-table__icono--inactivo'}
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
