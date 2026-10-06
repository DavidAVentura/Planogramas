import { useEffect, useRef, type KeyboardEvent } from 'react';
import './MenuPosicionLienzo.css';

const ANCHO_MENU = 240;
const ALTO_MENU = 230;

interface MenuPosicionLienzoProps {
  /** Coordenadas del viewport donde se hizo clic derecho. */
  x: number;
  y: number;
  titulo: string;
  subtitulo: string;
  /** Producto colocado por un agente que nadie confirmó: ofrece "Confirmar producto". */
  sinConfirmar: boolean;
  puedeEscribir: boolean;
  tieneSku: boolean;
  onReasignar: () => void;
  onConfirmar: () => void;
  onDetalle: () => void;
  onFicha: () => void;
  onClose: () => void;
}

/** Menú del clic derecho sobre un producto del lienzo: reasignar, confirmar, detalle y ficha. */
export function MenuPosicionLienzo({
  x,
  y,
  titulo,
  subtitulo,
  sinConfirmar,
  puedeEscribir,
  tieneSku,
  onReasignar,
  onConfirmar,
  onDetalle,
  onFicha,
  onClose,
}: MenuPosicionLienzoProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus();
    const cerrarFuera = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const cerrar = () => onClose();
    document.addEventListener('pointerdown', cerrarFuera);
    window.addEventListener('resize', cerrar);
    window.addEventListener('wheel', cerrar, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', cerrarFuera);
      window.removeEventListener('resize', cerrar);
      window.removeEventListener('wheel', cerrar);
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
  const accion = (fn: () => void) => () => {
    onClose();
    fn();
  };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Acciones de ${titulo}`}
      className="menu-posicion-lienzo"
      style={{ left, top }}
      data-pan-blocker
      onKeyDown={teclado}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="menu-posicion-lienzo__encabezado">
        <span className="menu-posicion-lienzo__titulo">{titulo}</span>
        <span className="menu-posicion-lienzo__subtitulo">{subtitulo}</span>
      </div>
      {puedeEscribir && (
        <button type="button" role="menuitem" className="menu-posicion-lienzo__opcion" onClick={accion(onReasignar)}>
          Reasignar producto…
        </button>
      )}
      {puedeEscribir && sinConfirmar && (
        <button type="button" role="menuitem" className="menu-posicion-lienzo__opcion" onClick={accion(onConfirmar)}>
          Confirmar producto
        </button>
      )}
      <button type="button" role="menuitem" className="menu-posicion-lienzo__opcion" onClick={accion(onDetalle)}>
        Ver detalle
      </button>
      <button type="button" role="menuitem" className="menu-posicion-lienzo__opcion" disabled={!tieneSku} onClick={accion(onFicha)}>
        Ficha del producto
      </button>
    </div>
  );
}
