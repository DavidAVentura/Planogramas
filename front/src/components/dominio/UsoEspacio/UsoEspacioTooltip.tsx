import { useState, type ReactNode } from 'react';
import type { UsoHorizontal, UsoVertical } from '../../../utils/usoEspacio';
import './UsoEspacioTooltip.css';

const cm = (n: number) => `${n.toFixed(1)} cm`;
const pct = (ratio: number | null) => (ratio === null ? '' : ` (${Math.round(ratio * 100)} %)`);

interface UsoEspacioDetalleProps {
  titulo: string;
  horizontal: UsoHorizontal;
  vertical: UsoVertical;
  /** Eje de la barra que abrió el tooltip; se resalta. */
  eje?: 'horizontal' | 'vertical';
}

/** Contenido del tooltip de uso de un nivel: espacio ocupado y libre en horizontal y en vertical. */
export function UsoEspacioDetalle({ titulo, horizontal, vertical, eje }: UsoEspacioDetalleProps) {
  const excedidoH = horizontal.libreCm < 0;
  const excedidoV = vertical.libreCm !== null && vertical.libreCm < 0;

  return (
    <div className="uso-espacio">
      <strong className="uso-espacio__titulo">{titulo}</strong>

      <div className={`uso-espacio__eje${eje === 'horizontal' ? ' uso-espacio__eje--activo' : ''}`}>
        <span className="uso-espacio__eje-nombre">↔ Horizontal</span>
        <span>
          Ocupado {cm(horizontal.ocupadoCm)} de {cm(horizontal.disponibleCm)}
          {pct(horizontal.ratio)}
        </span>
        <span className={excedidoH ? 'uso-espacio__alerta' : 'uso-espacio__libre'}>
          {excedidoH ? `Se pasa por ${cm(Math.abs(horizontal.libreCm))}` : `Libre ${cm(horizontal.libreCm)}`}
        </span>
        <span className="uso-espacio__nota">{horizontal.posiciones} posición(es)</span>
      </div>

      <div className={`uso-espacio__eje${eje === 'vertical' ? ' uso-espacio__eje--activo' : ''}`}>
        <span className="uso-espacio__eje-nombre">↕ Vertical</span>
        {vertical.ocupadoCm !== null ? (
          <span>
            Ocupado {cm(vertical.ocupadoCm)}
            {vertical.altoNivelCm !== null ? ` de ${cm(vertical.altoNivelCm)}` : ''}
            {pct(vertical.ratio)}
          </span>
        ) : (
          <span>Sin productos con alto registrado</span>
        )}
        {vertical.libreCm !== null ? (
          <span className={excedidoV ? 'uso-espacio__alerta' : 'uso-espacio__libre'}>
            {excedidoV ? `Se pasa por ${cm(Math.abs(vertical.libreCm))}` : `Libre ${cm(vertical.libreCm)}`}
          </span>
        ) : (
          <span className="uso-espacio__nota">
            {vertical.altoNivelCm !== null ? `Alto del nivel ${cm(vertical.altoNivelCm)}` : 'Alto del nivel desconocido'}
          </span>
        )}
        {vertical.masAlto && <span className="uso-espacio__nota">Más alto: {vertical.masAlto.etiqueta}</span>}
        {vertical.sinAlto > 0 && <span className="uso-espacio__nota">{vertical.sinAlto} producto(s) sin alto registrado</span>}
      </div>
    </div>
  );
}

interface ConTooltipUsoProps extends UsoEspacioDetalleProps {
  children: ReactNode;
  className?: string;
  /** Lado donde se abre el tooltip respecto de la barra. */
  lado?: 'arriba' | 'abajo';
}

/** Envuelve una barra de llenado: al pasar el mouse (o enfocarla) muestra el tooltip de uso. */
export function ConTooltipUso({ children, className, lado = 'arriba', ...detalle }: ConTooltipUsoProps) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div
      className={`uso-espacio-ancla${className ? ` ${className}` : ''}`}
      onMouseEnter={() => setAbierto(true)}
      onMouseLeave={() => setAbierto(false)}
      onFocus={() => setAbierto(true)}
      onBlur={() => setAbierto(false)}
      tabIndex={0}
      aria-label={`${detalle.titulo}: uso del espacio`}
    >
      {children}
      {abierto && (
        <div className={`uso-espacio-flotante uso-espacio-flotante--${lado}`} role="tooltip">
          <UsoEspacioDetalle {...detalle} />
        </div>
      )}
    </div>
  );
}
