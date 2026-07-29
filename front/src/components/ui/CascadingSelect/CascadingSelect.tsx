import type { JerarquiaItem } from '../../../types/jerarquia';
import './CascadingSelect.css';

interface CascadingSelectProps {
  areas: JerarquiaItem[];
  departamentos: JerarquiaItem[];
  areaValue: string;
  departamentoValue: string;
  onAreaChange: (areaId: string) => void;
  onDepartamentoChange: (departamentoId: string) => void;
  cargandoDepartamentos?: boolean;
  requerido?: boolean;
}

export function CascadingSelect({
  areas,
  departamentos,
  areaValue,
  departamentoValue,
  onAreaChange,
  onDepartamentoChange,
  cargandoDepartamentos = false,
  requerido = false,
}: CascadingSelectProps) {
  return (
    <div className="cascading-select">
      <label className="cascading-select__campo">
        <span>Área</span>
        <select
          value={areaValue}
          required={requerido}
          onChange={(e) => onAreaChange(e.target.value)}
        >
          <option value="">Seleccionar área</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name}
            </option>
          ))}
        </select>
      </label>

      <label className="cascading-select__campo">
        <span>Departamento</span>
        <select
          value={departamentoValue}
          required={requerido}
          disabled={!areaValue || cargandoDepartamentos}
          onChange={(e) => onDepartamentoChange(e.target.value)}
        >
          <option value="">
            {cargandoDepartamentos ? 'Cargando…' : 'Seleccionar departamento'}
          </option>
          {departamentos.map((depto) => (
            <option key={depto.id} value={depto.id}>
              {depto.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
