import { FILTROS_MI_TIENDA_INICIALES } from '../../../../constants/implementacion';
import type { FiltrosMiTienda } from '../../../../types/implementacion';
import './MiTiendaFiltros.css';

interface MiTiendaFiltrosProps {
  filtros: FiltrosMiTienda;
  departamentos: string[];
  /** Sin inventario, "Se puede implementar" no se puede decidir y el filtro queda deshabilitado. */
  inventarioDisponible: boolean;
  onChange: (parciales: Partial<FiltrosMiTienda>) => void;
}

export function MiTiendaFiltros({ filtros, departamentos, inventarioDisponible, onChange }: MiTiendaFiltrosProps) {
  const hayFiltros = (Object.keys(FILTROS_MI_TIENDA_INICIALES) as (keyof FiltrosMiTienda)[]).some(
    (k) => filtros[k] !== FILTROS_MI_TIENDA_INICIALES[k],
  );

  return (
    <div className="mi-tienda-filtros">
      <label className="mi-tienda-filtros__campo mi-tienda-filtros__campo--busqueda">
        <span>Buscar</span>
        <input
          type="search"
          placeholder="Planograma o código de versión"
          value={filtros.busqueda}
          onChange={(e) => onChange({ busqueda: e.target.value })}
        />
      </label>

      <label className="mi-tienda-filtros__campo">
        <span>Departamento</span>
        <select value={filtros.departamento} onChange={(e) => onChange({ departamento: e.target.value })}>
          <option value="">Todos</option>
          {departamentos.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>

      <label className="mi-tienda-filtros__campo">
        <span>Versión</span>
        <select
          value={filtros.estado}
          onChange={(e) => onChange({ estado: e.target.value as FiltrosMiTienda['estado'] })}
        >
          <option value="">Todas</option>
          <option value="publicado">Publicada</option>
          <option value="piloto">Piloto</option>
        </select>
      </label>

      <label
        className="mi-tienda-filtros__campo"
        title={inventarioDisponible ? undefined : 'Inventario no disponible en este momento'}
      >
        <span>Se puede implementar</span>
        <select
          value={inventarioDisponible ? filtros.implementable : ''}
          disabled={!inventarioDisponible}
          onChange={(e) => onChange({ implementable: e.target.value as FiltrosMiTienda['implementable'] })}
        >
          <option value="">Todos</option>
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
      </label>

      <label className="mi-tienda-filtros__campo">
        <span>Evidencia pendiente</span>
        <select
          value={filtros.evidencia}
          onChange={(e) => onChange({ evidencia: e.target.value as FiltrosMiTienda['evidencia'] })}
        >
          <option value="">Todos</option>
          <option value="pendiente">Pendiente</option>
          <option value="reportado">Reportado</option>
        </select>
      </label>

      {hayFiltros && (
        <button type="button" className="mi-tienda-filtros__limpiar" onClick={() => onChange(FILTROS_MI_TIENDA_INICIALES)}>
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
