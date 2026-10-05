import { useEffect, useRef, type KeyboardEvent } from 'react';
import './MenuCeldaAsignacion.css';

const ANCHO_MENU = 244;
const ALTO_MENU = 196;

interface MenuCeldaAsignacionProps {
  /** Coordenadas del viewport donde se hizo clic derecho. */
  x: number;
  y: number;
  planograma: string;
  tienda: string;
  estado: string;
  /** Si viene, "Ver versión" queda deshabilitado con este motivo. */
  motivoSinVersion: string | null;
  /** Si viene, "Montaje de tienda" queda deshabilitado con este motivo. */
  motivoSinMontaje: string | null;
  onHistorial: () => void;
  onVerVersion: () => void;
  onMontaje: () => void;
  onClose: () => void;
}

export function MenuCeldaAsignacion({
  x,
  y,
  planograma,
  tienda,
  estado,
  motivoSinVersion,
  motivoSinMontaje,
  onHistorial,
  onVerVersion,
  onMontaje,
  onClose,
}: MenuCeldaAsignacionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus();
    const cerrarFuera = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const cerrar = () => onClose();
    document.addEventListener('pointerdown', cerrarFuera);
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      document.removeEventListener('pointerdown', cerrarFuera);
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [onClose]);

  function teclado(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const opciones = [...(ref.current?.querySelectorAll<HTMLButtonElement>('[role=menuitem]:not(:disabled)') ?? [])];
    const actual = opciones.indexOf(document.activeElement as HTMLButtonElement);
    const siguiente = e.key === 'ArrowDown' ? (actual + 1) % opciones.length : (actual - 1 + opciones.length) % opciones.length;
    opciones[siguiente]?.focus();
  }

  const left = Math.min(Math.max(x, 8), window.innerWidth - ANCHO_MENU - 8);
  const top = Math.min(Math.max(y, 8), window.innerHeight - ALTO_MENU - 8);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Acciones de ${planograma} en ${tienda}`}
      className="menu-celda-asignacion"
      style={{ left, top }}
      onKeyDown={teclado}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="menu-celda-asignacion__encabezado">
        <span className="menu-celda-asignacion__planograma">{planograma}</span>
        <span className="menu-celda-asignacion__estado">
          <span className="mono">{tienda}</span> · {estado}
        </span>
      </div>
      <button type="button" role="menuitem" className="menu-celda-asignacion__opcion" onClick={onHistorial}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12a9 9 0 103-6.7L3 8" />
          <path d="M3 3v5h5" />
          <path d="M12 7v5l3 2" />
        </svg>
        Historial
      </button>
      <button
        type="button"
        role="menuitem"
        className="menu-celda-asignacion__opcion"
        disabled={motivoSinVersion !== null}
        onClick={onVerVersion}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18M9 10v10" />
        </svg>
        <span className="menu-celda-asignacion__texto">
          Ver versión
          {motivoSinVersion && <span className="menu-celda-asignacion__nota">{motivoSinVersion}</span>}
        </span>
      </button>
      <button
        type="button"
        role="menuitem"
        className="menu-celda-asignacion__opcion"
        disabled={motivoSinMontaje !== null}
        onClick={onMontaje}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
        <span className="menu-celda-asignacion__texto">
          Montaje de tienda
          {motivoSinMontaje && <span className="menu-celda-asignacion__nota">{motivoSinMontaje}</span>}
        </span>
      </button>
    </div>
  );
}
