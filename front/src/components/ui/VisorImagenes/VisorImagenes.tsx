import { useCallback, useEffect, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { precargarImagen, useImagenCacheada } from '../../../hooks/useImagenCacheada';
import './VisorImagenes.css';

export interface ImagenVisor {
  /** Clave única de la imagen en la caché (utils/cacheImagenes.ts). */
  clave: string;
  alt: string;
  pie?: ReactNode;
  descargar: () => Promise<Blob>;
}

interface VisorImagenesProps {
  imagenes: ImagenVisor[];
  indiceInicial: number;
  onClose: () => void;
}

const ESCALA_MINIMA = 1;
const ESCALA_MAXIMA = 8;
const PASO_BOTON = 1.5;
const ESCALA_DOBLE_CLIC = 2.5;

interface Vista {
  escala: number;
  x: number;
  y: number;
}

const VISTA_INICIAL: Vista = { escala: 1, x: 0, y: 0 };

function limitar(valor: number, min: number, max: number) {
  return Math.min(Math.max(valor, min), max);
}

function Icono({ d }: { d: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/**
 * Visor a pantalla completa: zoom (rueda, doble clic o botones), arrastrar para desplazarse con
 * zoom, y flechas ← → (teclado o botones) para pasar entre imágenes. Esc cierra.
 */
export function VisorImagenes({ imagenes, indiceInicial, onClose }: VisorImagenesProps) {
  const [indice, setIndice] = useState(indiceInicial);
  const [vista, setVista] = useState<Vista>(VISTA_INICIAL);
  const [arrastrando, setArrastrando] = useState(false);
  const escenarioRef = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ x: number; y: number; vistaX: number; vistaY: number } | null>(null);

  const actual = imagenes[indice];
  const { url, error } = useImagenCacheada(actual.clave, actual.descargar);
  const hayVarias = imagenes.length > 1;

  const irA = useCallback(
    (delta: number) => {
      if (!hayVarias) return;
      setIndice((i) => (i + delta + imagenes.length) % imagenes.length);
      setVista(VISTA_INICIAL);
    },
    [hayVarias, imagenes.length],
  );

  /** Cambia la escala manteniendo fijo el punto (px, py), relativo al centro del escenario. */
  const zoomEn = useCallback((factor: number, px = 0, py = 0) => {
    setVista((v) => {
      const escala = limitar(v.escala * factor, ESCALA_MINIMA, ESCALA_MAXIMA);
      if (escala === ESCALA_MINIMA) return VISTA_INICIAL;
      const r = escala / v.escala;
      return { escala, x: px - (px - v.x) * r, y: py - (py - v.y) * r };
    });
  }, []);

  // Las fotos vecinas se bajan por adelantado para que la navegación sea inmediata.
  useEffect(() => {
    if (!hayVarias) return;
    const siguiente = imagenes[(indice + 1) % imagenes.length];
    const anterior = imagenes[(indice - 1 + imagenes.length) % imagenes.length];
    precargarImagen(siguiente.clave, siguiente.descargar);
    precargarImagen(anterior.clave, anterior.descargar);
  }, [indice, imagenes, hayVarias]);

  useEffect(() => {
    function teclado(e: KeyboardEvent) {
      const acciones: Record<string, () => void> = {
        Escape: onClose,
        ArrowRight: () => irA(1),
        ArrowLeft: () => irA(-1),
        '+': () => zoomEn(PASO_BOTON),
        '=': () => zoomEn(PASO_BOTON),
        '-': () => zoomEn(1 / PASO_BOTON),
        '0': () => setVista(VISTA_INICIAL),
      };
      const accion = acciones[e.key];
      if (!accion) return;
      // Captura: el visor va encima de un modal, Esc y las flechas no deben llegar a la página.
      e.preventDefault();
      e.stopPropagation();
      accion();
    }
    window.addEventListener('keydown', teclado, true);
    return () => window.removeEventListener('keydown', teclado, true);
  }, [onClose, irA, zoomEn]);

  function puntoRelativo(clientX: number, clientY: number) {
    const rect = escenarioRef.current!.getBoundingClientRect();
    return { px: clientX - rect.left - rect.width / 2, py: clientY - rect.top - rect.height / 2 };
  }

  // Listener nativo y no pasivo: con onWheel de React no se puede evitar que la rueda desplace la
  // página que queda detrás del visor.
  useEffect(() => {
    const escenario = escenarioRef.current!;
    function alGirarRueda(e: globalThis.WheelEvent) {
      e.preventDefault();
      const rect = escenario.getBoundingClientRect();
      zoomEn(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left - rect.width / 2, e.clientY - rect.top - rect.height / 2);
    }
    escenario.addEventListener('wheel', alGirarRueda, { passive: false });
    return () => escenario.removeEventListener('wheel', alGirarRueda);
  }, [zoomEn]);

  function alDobleClic(e: MouseEvent<HTMLDivElement>) {
    if (vista.escala > ESCALA_MINIMA) {
      setVista(VISTA_INICIAL);
      return;
    }
    const { px, py } = puntoRelativo(e.clientX, e.clientY);
    zoomEn(ESCALA_DOBLE_CLIC, px, py);
  }

  function alPresionar(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || vista.escala === ESCALA_MINIMA) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastre.current = { x: e.clientX, y: e.clientY, vistaX: vista.x, vistaY: vista.y };
    setArrastrando(true);
  }

  function alMover(e: PointerEvent<HTMLDivElement>) {
    const inicio = arrastre.current;
    if (!inicio) return;
    setVista((v) => ({ ...v, x: inicio.vistaX + e.clientX - inicio.x, y: inicio.vistaY + e.clientY - inicio.y }));
  }

  function alSoltar() {
    arrastre.current = null;
    setArrastrando(false);
  }

  const claseEscenario = [
    'visor-imagenes__escenario',
    vista.escala > ESCALA_MINIMA && 'visor-imagenes__escenario--zoom',
    arrastrando && 'visor-imagenes__escenario--arrastrando',
  ].filter(Boolean).join(' ');

  return createPortal(
    <div className="visor-imagenes" role="dialog" aria-modal="true" aria-label={`Imagen ${indice + 1} de ${imagenes.length}: ${actual.alt}`}>
      <div className="visor-imagenes__barra">
        <span className="visor-imagenes__contador">
          {indice + 1} / {imagenes.length}
        </span>
        <div className="visor-imagenes__acciones">
          <button type="button" className="visor-imagenes__boton" onClick={() => zoomEn(1 / PASO_BOTON)} disabled={vista.escala === ESCALA_MINIMA} title="Alejar (−)" aria-label="Alejar">
            <Icono d="M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5M8 11h6" />
          </button>
          <span className="visor-imagenes__escala">{Math.round(vista.escala * 100)}%</span>
          <button type="button" className="visor-imagenes__boton" onClick={() => zoomEn(PASO_BOTON)} disabled={vista.escala === ESCALA_MAXIMA} title="Acercar (+)" aria-label="Acercar">
            <Icono d="M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5M8 11h6M11 8v6" />
          </button>
          <button type="button" className="visor-imagenes__boton" onClick={() => setVista(VISTA_INICIAL)} disabled={vista.escala === ESCALA_MINIMA} title="Ajustar a pantalla (0)" aria-label="Ajustar a pantalla">
            <Icono d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
          </button>
          <button type="button" className="visor-imagenes__boton" onClick={onClose} title="Cerrar (Esc)" aria-label="Cerrar">
            <Icono d="M6 6l12 12M18 6L6 18" />
          </button>
        </div>
      </div>

      <div
        ref={escenarioRef}
        className={claseEscenario}
        onDoubleClick={alDobleClic}
        onPointerDown={alPresionar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alSoltar}
      >
        {url ? (
          <img
            className="visor-imagenes__imagen"
            src={url}
            alt={actual.alt}
            draggable={false}
            style={{ transform: `translate(${vista.x}px, ${vista.y}px) scale(${vista.escala})` }}
          />
        ) : (
          <span className="visor-imagenes__estado">{error ? 'No se pudo cargar la imagen' : 'Cargando…'}</span>
        )}
      </div>

      {hayVarias && (
        <>
          <button type="button" className="visor-imagenes__nav visor-imagenes__nav--anterior" onClick={() => irA(-1)} title="Anterior (←)" aria-label="Imagen anterior">
            <Icono d="M15 5l-7 7 7 7" />
          </button>
          <button type="button" className="visor-imagenes__nav visor-imagenes__nav--siguiente" onClick={() => irA(1)} title="Siguiente (→)" aria-label="Imagen siguiente">
            <Icono d="M9 5l7 7-7 7" />
          </button>
        </>
      )}

      {actual.pie && <div className="visor-imagenes__pie">{actual.pie}</div>}
    </div>,
    document.body,
  );
}
