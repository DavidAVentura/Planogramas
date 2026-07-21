import './CapacityBar.css';

interface CapacityBarProps {
  ocupadoCm: number;
  disponibleCm: number;
}

export function CapacityBar({ ocupadoCm, disponibleCm }: CapacityBarProps) {
  const libre = disponibleCm - ocupadoCm;
  const sobreOcupado = libre < 0;
  const porcentaje = disponibleCm > 0 ? Math.min((ocupadoCm / disponibleCm) * 100, 100) : 0;

  return (
    <div className="capacity-bar">
      <div className="capacity-bar__track">
        <div
          className={`capacity-bar__fill ${sobreOcupado ? 'capacity-bar__fill--sobre' : ''}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      <span className={`capacity-bar__texto ${sobreOcupado ? 'capacity-bar__texto--sobre' : ''}`}>
        {ocupadoCm.toFixed(1)} / {disponibleCm.toFixed(1)} cm
        {sobreOcupado && ` · sobre-ocupado ${Math.abs(libre).toFixed(1)} cm`}
      </span>
    </div>
  );
}
