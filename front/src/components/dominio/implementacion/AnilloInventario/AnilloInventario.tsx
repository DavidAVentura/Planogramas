import { textoPorcentaje } from '../../../../domain/implementacion/miTienda';
import './AnilloInventario.css';

interface AnilloInventarioProps {
  /** `null` cuando el inventario no está disponible: anillo gris con "—". */
  porcentaje: number | null;
  implementable: boolean | null;
  umbral: number;
  conInventario: number | null;
  total: number;
}

const RADIO = 16;
const GROSOR = 5;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

/** Extremos de la marca del umbral, cruzando el anillo a `umbral` % desde las 12 en sentido horario. */
function marcaUmbral(umbral: number) {
  const angulo = (umbral / 100) * 2 * Math.PI;
  const [interior, exterior] = [RADIO - GROSOR / 2 - 1, RADIO + GROSOR / 2 + 1];
  const punto = (r: number) => ({ x: 20 + r * Math.sin(angulo), y: 20 - r * Math.cos(angulo) });
  const a = punto(interior);
  const b = punto(exterior);
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}

/**
 * Anillo tipo reloj: se llena en sentido horario desde las 12 según el % de productos con
 * inventario; la marca oscura es el umbral para poder implementar.
 */
export function AnilloInventario({ porcentaje, implementable, umbral, conInventario, total }: AnilloInventarioProps) {
  const sinDato = porcentaje === null;
  const variante = sinDato ? 'sin-dato' : implementable ? 'si' : 'no';
  const avance = sinDato ? 0 : Math.max(0, Math.min(100, porcentaje));
  const marca = marcaUmbral(umbral);
  const descripcion = sinDato
    ? `Inventario no disponible (${total} productos)`
    : `${conInventario} de ${total} productos con inventario, ${textoPorcentaje(porcentaje)}`;

  return (
    <span className={`anillo-inventario anillo-inventario--${variante}`} role="img" aria-label={descripcion}>
      <span className="anillo-inventario__grafico" aria-hidden="true">
        <svg width="44" height="44" viewBox="0 0 40 40">
          <circle className="anillo-inventario__pista" cx="20" cy="20" r={RADIO} strokeWidth={GROSOR} />
          {!sinDato && (
            <circle
              className="anillo-inventario__avance"
              cx="20"
              cy="20"
              r={RADIO}
              fill="none"
              strokeWidth={GROSOR}
              strokeDasharray={`${((avance / 100) * CIRCUNFERENCIA).toFixed(2)} ${CIRCUNFERENCIA.toFixed(2)}`}
              transform="rotate(-90 20 20)"
            />
          )}
          <line className="anillo-inventario__marca" {...marca} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span className="anillo-inventario__porcentaje">{sinDato ? '—' : `${Math.round(avance)}%`}</span>
      </span>
      <span className="anillo-inventario__conteo" aria-hidden="true">
        {sinDato ? (
          `${total} productos`
        ) : (
          <>
            <strong>{conInventario}</strong> de {total}
          </>
        )}
      </span>
    </span>
  );
}
