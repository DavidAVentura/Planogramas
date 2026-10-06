import { ConTooltipUso } from '../../UsoEspacio/UsoEspacioTooltip';
import type { UsoHorizontal, UsoVertical } from '../../../../utils/usoEspacio';
import './CapacityBar.css';

interface CapacityBarProps {
  titulo: string;
  horizontal: UsoHorizontal;
  vertical: UsoVertical;
}

/** Barra de llenado horizontal del nivel; al pasar el mouse muestra el uso en ambos ejes. */
export function CapacityBar({ titulo, horizontal, vertical }: CapacityBarProps) {
  const { ocupadoCm, disponibleCm, libreCm } = horizontal;
  const sobreOcupado = libreCm < 0;
  const porcentaje = disponibleCm > 0 ? Math.min((ocupadoCm / disponibleCm) * 100, 100) : 0;

  return (
    <ConTooltipUso className="capacity-bar" titulo={titulo} horizontal={horizontal} vertical={vertical} eje="horizontal">
      <div className="capacity-bar__track">
        <div
          className={`capacity-bar__fill ${sobreOcupado ? 'capacity-bar__fill--sobre' : ''}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      <span className={`capacity-bar__texto ${sobreOcupado ? 'capacity-bar__texto--sobre' : ''}`}>
        {ocupadoCm.toFixed(1)} / {disponibleCm.toFixed(1)} cm
        {sobreOcupado && ` · sobre-ocupado ${Math.abs(libreCm).toFixed(1)} cm`}
      </span>
    </ConTooltipUso>
  );
}
