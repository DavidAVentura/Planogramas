import { Link } from 'react-router-dom';
import { AnilloInventario } from '../AnilloInventario/AnilloInventario';
import { ImplementableBadge } from '../ImplementableBadge/ImplementableBadge';
import { EstadoVersionBadge } from '../EstadoVersionBadge/EstadoVersionBadge';
import { BotonArchivos, BotonEvidencia } from '../AccionesVersion/AccionesVersion';
import { tooltipPlanograma } from '../../../../utils/formatters';
import type { PlanogramaImplementacion } from '../../../../types/implementacion';
import './MiTiendaTable.css';

interface MiTiendaTableProps {
  planogramas: PlanogramaImplementacion[];
  umbral: number;
  inventarioDisponible: boolean;
  onArchivos: (p: PlanogramaImplementacion) => void;
  onEvidencia: (p: PlanogramaImplementacion) => void;
}

/** Planogramas asignados a la tienda, con la versión que le toca montar. */
export function MiTiendaTable({ planogramas, umbral, inventarioDisponible, onArchivos, onEvidencia }: MiTiendaTableProps) {
  return (
    <table className="table mi-tienda-table" aria-label="Planogramas asignados a la tienda">
      <thead>
        <tr>
          <th>DEPARTAMENTO</th>
          <th>PLANOGRAMA VERSIÓN</th>
          <th>CON INVENTARIO</th>
          <th>IMPLEMENTAR</th>
          <th className="mi-tienda-table__col-acciones">
            <span className="mi-tienda-table__oculto">Acciones</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {planogramas.map((p) => (
          <tr key={p.versionId}>
            <td data-label="Departamento">{p.departamento}</td>
            <td data-label="Planograma versión">
              <span className="mi-tienda-table__version">
                <span className="mi-tienda-table__codigo" title={tooltipPlanograma(p.nombre, p.descripcion)}>
                  {p.codigo}
                </span>
                {p.descripcion && <span className="mi-tienda-table__descripcion">{p.descripcion}</span>}
                <EstadoVersionBadge estado={p.estado} />
              </span>
            </td>
            <td data-label="Con inventario">
              <AnilloInventario
                porcentaje={inventarioDisponible ? p.porcentajeInventario : null}
                implementable={p.implementable}
                umbral={umbral}
                conInventario={p.conInventario}
                total={p.totalProductos}
              />
            </td>
            <td data-label="Implementar">
              <ImplementableBadge implementable={inventarioDisponible ? p.implementable : null} />
            </td>
            <td className="mi-tienda-table__col-acciones" data-label="Acciones">
              <span className="mi-tienda-table__acciones">
                <BotonArchivos planograma={p} onClick={() => onArchivos(p)} />
                <BotonEvidencia planograma={p} onClick={() => onEvidencia(p)} />
                <Link
                  className="mi-tienda-table__detalle"
                  to={`/mi-tienda/productos?versiones=${p.versionId}`}
                  aria-label={`Ver productos de ${p.nombre}`}
                >
                  Detalle
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
