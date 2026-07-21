import { useEffect, useState } from 'react';
import { useJerarquia } from '../../../../hooks/useJerarquia';
import { CascadingSelect } from '../../../ui/CascadingSelect/CascadingSelect';
import { Button } from '../../../ui/Button/Button';
import type { ListarPlanogramasFiltros, PlanogramaEstado } from '../../../../types/planograma';
import './FiltrosBar.css';

const OPCIONES_ESTADO: { value: PlanogramaEstado | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'activo', label: 'Activo' },
  { value: 'archivado', label: 'Archivado' },
];

interface FiltrosBarProps {
  filtros: ListarPlanogramasFiltros;
  onChange: (parciales: Partial<ListarPlanogramasFiltros>) => void;
}

export function FiltrosBar({ filtros, onChange }: FiltrosBarProps) {
  const { areas, departamentos, cargandoDepartamentos, cargarDepartamentos } = useJerarquia();
  const [area, setArea] = useState('');
  // El <select> de CascadingSelect trabaja con el id de CATI; Planograma.departamento se
  // guarda por nombre (así lo hace el backend real, ver nota en PlanogramaFormModal) — acá se
  // traduce id -> name antes de mandarlo como filtro.
  const [departamentoId, setDepartamentoId] = useState('');
  const [search, setSearch] = useState(filtros.search ?? '');

  useEffect(() => {
    cargarDepartamentos(area);
  }, [area, cargarDepartamentos]);

  const hayFiltrosActivos = Boolean(filtros.departamento || filtros.estado || filtros.search);

  function limpiar() {
    setArea('');
    setDepartamentoId('');
    setSearch('');
    onChange({ departamento: undefined, estado: undefined, search: undefined });
  }

  return (
    <div className="filtros-bar">
      <CascadingSelect
        areas={areas}
        departamentos={departamentos}
        areaValue={area}
        departamentoValue={departamentoId}
        cargandoDepartamentos={cargandoDepartamentos}
        onAreaChange={(areaId) => {
          setArea(areaId);
          setDepartamentoId('');
          onChange({ departamento: undefined });
        }}
        onDepartamentoChange={(id) => {
          setDepartamentoId(id);
          const depto = departamentos.find((d) => d.id === id);
          onChange({ departamento: depto?.name });
        }}
      />

      <label className="filtros-bar__campo">
        <span>Estado</span>
        <select
          className="filtros-bar__estado"
          value={filtros.estado ?? ''}
          onChange={(e) => onChange({ estado: (e.target.value || undefined) as PlanogramaEstado | undefined })}
        >
          {OPCIONES_ESTADO.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      </label>

      <label className="filtros-bar__campo filtros-bar__campo--busqueda">
        <span>Buscar</span>
        <input
          className="filtros-bar__busqueda"
          type="search"
          placeholder="Buscar por nombre…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onBlur={() => onChange({ search: search.trim() || undefined })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onChange({ search: search.trim() || undefined });
          }}
        />
      </label>

      {hayFiltrosActivos && (
        <Button variante="ghost" onClick={limpiar}>
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
