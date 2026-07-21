import type { ReactNode } from 'react';
import './Table.css';

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  vacio?: ReactNode;
}

export function Table<T>({ columns, rows, rowKey, onRowClick, rowClassName, vacio }: TableProps<T>) {
  if (rows.length === 0 && vacio) return <>{vacio}</>;

  return (
    <table className="table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={rowKey(row)}
            className={
              [onRowClick ? 'table__fila--clickeable' : '', rowClassName?.(row) ?? '']
                .filter(Boolean)
                .join(' ') || undefined
            }
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            {columns.map((col) => (
              <td key={col.key} data-label={col.header}>
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
