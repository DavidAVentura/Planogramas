import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import { NivelFilaLienzo } from '../NivelFilaLienzo/NivelFilaLienzo';
import type { CapacidadNivel, GondolaLienzo, NivelLienzo, PosicionLienzo, ProductoCatalogo } from '../../../../domain/lienzo/lienzo.types';
import type { HojaSeccion, NodoSeccion } from '../../../../types/seccion';
import { calcularGapCm } from '../../../../domain/lienzo/geometria.service';
import { calcularCapacidadNivel } from '../../../../domain/lienzo/capacidad.service';
import { ALTURA_MIN_NIVEL_PX, PX_POR_CM, calcularAnchoFramePx } from '../constantesLienzo';
import './GondolaFrameLienzo.css';

/** Separación (px) entre secciones hermanas dentro de una góndola dividida. */
const GAP_SECCIONES_PX = 6;

export interface GondolaFrameLienzoProps {
  gondola: GondolaLienzo;
  /** Escala actual del lienzo (`view.scale` de `useCanvasViewport`) — necesaria para convertir
   * el desplazamiento en píxeles de pantalla al arrastrar el encabezado a desplazamiento en
   * coordenadas de mundo. */
  scale: number;
  /** Igual que en el Editor real: sin permiso de escritura no se muestran arrastres ni botones de agregar/quitar. */
  puedeEscribir: boolean;
  posicionSeleccionadaId: string | null;
  resolverProducto: (sku: string) => ProductoCatalogo | undefined;
  /**
   * Cómo calcular la capacidad de un nivel. Por defecto asume que el ancho disponible es el
   * ancho de la góndola (criterio de los datos de ejemplo); cuando el Lienzo está conectado al
   * backend real, cada nivel ya trae su propio `ancho_disponible_cm` — el llamador inyecta ese
   * cálculo real acá en vez de dejar el valor por defecto.
   */
  resolverCapacidad?: (nivel: NivelLienzo) => CapacidadNivel;
  /**
   * Cómo decidir si una posición "desborda" el nivel. Por defecto lo infiere geométricamente
   * (alto de la posición vs. hueco libre) — útil sobre datos de ejemplo. El dominio real no
   * registra el alto físico de una posición ya colocada; ahí el llamador inyecta la bandera
   * manual `desborda_gondola` en su lugar.
   */
  resolverDesborda?: (posicion: PosicionLienzo, gapCm: number) => boolean;
  /** Números de gancho calculados por posición — solo se dibujan si el llamador los pasa. */
  resolverGanchos?: (posicionId: string) => number[] | undefined;
  onMoverGondola: (gondolaId: string, x: number, y: number) => void;
  onEditarGondola?: (gondolaId: string) => void;
  onEliminarGondola?: (gondolaId: string) => void;
  /** Abre (o cierra, si `expandida`) el detalle de la góndola. Sin esta prop no hay botón. */
  onExpandir?: (gondolaId: string) => void;
  expandida?: boolean;
  /** Góndola dividida: sección resaltada y cómo seleccionarla (detalle de góndola). */
  seccionSeleccionadaId?: number | null;
  onSeleccionarSeccion?: (seccionId: number) => void;
  /** `seccionId` solo viene en góndolas divididas: el nivel nuevo se crea en esa sección. */
  onAgregarNivel: (gondolaId: string, ordenDestino: number, seccionId?: number | null) => void;
  onEditarNivel: (nivelId: string) => void;
  onEliminarNivel: (nivelId: string) => void;
  onSeleccionarPosicion: (id: string) => void;
  onAbrirDetallePosicion: (id: string) => void;
  onAbrirFichaPosicion: (sku: string) => void;
  onSoltarProductoEnNivel: (nivelId: string, sku: string) => void;
  onSoltarPosicionEnNivel: (posicionId: string, nivelDestinoId: string) => void;
  onAsignarSkuPorDrop: (posicionId: string, sku: string) => void;
  onAgregarPosicionPendiente: (nivelId: string, ordenDestino: number) => void;
}

const resolverCapacidadPorDefecto = (nivel: NivelLienzo, anchoGondolaCm: number) => calcularCapacidadNivel(nivel, anchoGondolaCm);
const resolverDesbordaPorDefecto = (posicion: PosicionLienzo, gapCm: number) => posicion.altoCm > gapCm;

/** Niveles de una hoja: los suyos más, en la primera hoja, los que todavía no tienen sección. */
function nivelesDeHoja(niveles: NivelLienzo[], hoja: HojaSeccion, primeraHojaId: number): NivelLienzo[] {
  return niveles.filter((n) => (n.seccionId ?? primeraHojaId) === hoja.id);
}

/**
 * Una góndola dibujada como "frame" independiente sobre el lienzo (inspirado en cómo n8n
 * dibuja cada flujo): encabezado arrastrable, regla vertical de cm desde el piso, y sus
 * niveles apilados de arriba (orden 1) hacia abajo. Entre niveles aparece un botón "+" al
 * pasar el mouse para insertar un nivel nuevo ahí — el mismo gesto que n8n usa para insertar
 * un nodo en medio de una conexión.
 *
 * Si la góndola está dividida en secciones (columnas o franjas), cada sección se dibuja con sus
 * propios niveles y sus propios "+"; sin dividir, el frame es exactamente el de siempre.
 */
export function GondolaFrameLienzo(props: GondolaFrameLienzoProps) {
  const { gondola, scale, puedeEscribir, onMoverGondola, onEditarGondola, onEliminarGondola, onAgregarNivel, onExpandir, expandida } = props;
  const [arrastrando, setArrastrando] = useState(false);
  const estructura = gondola.estructura;
  const dividida = Boolean(estructura?.dividida && estructura.raiz);

  function onPointerDownEncabezado(e: ReactPointerEvent<HTMLDivElement>) {
    if (!puedeEscribir || (e.target as HTMLElement).closest('button')) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const gx = gondola.x;
    const gy = gondola.y;
    setArrastrando(true);

    function onMove(ev: globalThis.PointerEvent) {
      onMoverGondola(gondola.id, gx + (ev.clientX - startX) / scale, gy + (ev.clientY - startY) / scale);
    }
    function onUp() {
      setArrastrando(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  const ordenMasAlto = gondola.niveles.reduce((max, n) => Math.max(max, n.orden), 0);

  // Ancho del frame: sin dividir, el de siempre; dividida, la suma/máximo de sus secciones.
  const hojasPorId = new Map((estructura?.hojas ?? []).map((h) => [h.id, h]));
  const primeraHojaId = estructura?.hojas[0]?.id ?? 0;
  function anchoNodoPx(nodo: NodoSeccion): number {
    if (!nodo.esDivision) {
      const hoja = hojasPorId.get(nodo.id);
      return hoja ? calcularAnchoFramePx(hoja.anchoCm, nivelesDeHoja(gondola.niveles, hoja, primeraHojaId)) : 0;
    }
    const anchos = nodo.hijos.map(anchoNodoPx);
    return nodo.direccion === 'COLUMNAS'
      ? anchos.reduce((s, a) => s + a, 0) + GAP_SECCIONES_PX * (anchos.length - 1)
      : Math.max(...anchos);
  }
  const anchoFrame = dividida && estructura?.raiz
    ? anchoNodoPx(estructura.raiz) + 2 * GAP_SECCIONES_PX + 2
    : calcularAnchoFramePx(gondola.anchoCm, gondola.niveles);

  return (
    <div
      className={`gondola-frame-lienzo${arrastrando ? ' gondola-frame-lienzo--arrastrando' : ''}`}
      style={{ left: gondola.x, top: gondola.y, width: anchoFrame }}
    >
      <div className="gondola-frame-lienzo__header" data-pan-blocker onPointerDown={onPointerDownEncabezado}>
        <span className="gondola-frame-lienzo__nombre">{gondola.nombre}</span>
        <span className="gondola-frame-lienzo__ancho">{gondola.anchoCm} cm</span>
        {dividida && <span className="gondola-frame-lienzo__ancho">{estructura?.hojas.length} secciones</span>}
        {(puedeEscribir || onExpandir) && (
          <span className="gondola-frame-lienzo__acciones">
            {puedeEscribir && !dividida && (
              <button type="button" className="gondola-frame-lienzo__agregar-nivel" onClick={() => onAgregarNivel(gondola.id, ordenMasAlto + 1)}>
                + nivel
              </button>
            )}
            {onExpandir && (
              <button
                type="button"
                className="gondola-frame-lienzo__expandir"
                title={expandida ? 'Volver al lienzo' : 'Abrir detalle de la góndola'}
                aria-label={expandida ? 'Volver al lienzo' : `Abrir detalle de ${gondola.nombre}`}
                onClick={() => onExpandir(gondola.id)}
              >
                {expandida ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
                  </svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                )}
              </button>
            )}
            {puedeEscribir && onEditarGondola && (
              <button type="button" title="Editar góndola" aria-label="Editar góndola" onClick={() => onEditarGondola(gondola.id)}>
                ✎
              </button>
            )}
            {puedeEscribir && onEliminarGondola && (
              <button type="button" title="Eliminar góndola" aria-label="Eliminar góndola" onClick={() => onEliminarGondola(gondola.id)}>
                ×
              </button>
            )}
          </span>
        )}
      </div>

      {dividida && estructura?.raiz ? (
        <div className="gondola-frame-lienzo__secciones">
          <NodoSeccionLienzo nodo={estructura.raiz} hojasPorId={hojasPorId} primeraHojaId={primeraHojaId} props={props} />
        </div>
      ) : (
        <ColumnaNiveles props={props} niveles={gondola.niveles} anchoCm={gondola.anchoCm} seccionId={null} />
      )}
    </div>
  );
}

/** Un nodo del árbol de secciones: una división (fila/columna de hijas) o una sección con niveles. */
function NodoSeccionLienzo({
  nodo,
  hojasPorId,
  primeraHojaId,
  props,
}: {
  nodo: NodoSeccion;
  hojasPorId: Map<number, HojaSeccion>;
  primeraHojaId: number;
  props: GondolaFrameLienzoProps;
}) {
  if (nodo.esDivision) {
    return (
      <div className={`gondola-frame-lienzo__division gondola-frame-lienzo__division--${(nodo.direccion ?? 'FILAS').toLowerCase()}`}>
        {nodo.hijos.map((hijo) => (
          <NodoSeccionLienzo key={hijo.id} nodo={hijo} hojasPorId={hojasPorId} primeraHojaId={primeraHojaId} props={props} />
        ))}
      </div>
    );
  }

  const hoja = hojasPorId.get(nodo.id);
  if (!hoja) return null;
  const niveles = nivelesDeHoja(props.gondola.niveles, hoja, primeraHojaId);
  const seleccionada = props.seccionSeleccionadaId === hoja.id;

  return (
    <div
      className={`gondola-frame-lienzo__seccion${seleccionada ? ' gondola-frame-lienzo__seccion--seleccionada' : ''}`}
      style={{ width: calcularAnchoFramePx(hoja.anchoCm, niveles) }}
    >
      <button
        type="button"
        className="gondola-frame-lienzo__seccion-etiqueta"
        title={props.onSeleccionarSeccion ? `Seleccionar sección ${hoja.indice}` : undefined}
        disabled={!props.onSeleccionarSeccion}
        onClick={() => props.onSeleccionarSeccion?.(hoja.id)}
      >
        S{hoja.indice} · {hoja.anchoCm} × {hoja.altoCm} cm
      </button>
      <ColumnaNiveles props={props} niveles={niveles} anchoCm={hoja.anchoCm} seccionId={hoja.id} />
    </div>
  );
}

/** Regla vertical + niveles apilados (con sus "+" de inserción) de la góndola o de una sección. */
function ColumnaNiveles({
  props,
  niveles,
  anchoCm,
  seccionId,
}: {
  props: GondolaFrameLienzoProps;
  niveles: NivelLienzo[];
  anchoCm: number;
  seccionId: number | null;
}) {
  const { gondola, puedeEscribir, posicionSeleccionadaId, resolverProducto, resolverCapacidad, resolverDesborda, resolverGanchos, onAgregarNivel } = props;
  const columna: GondolaLienzo = { ...gondola, anchoCm, niveles };

  const ordenadosAsc = [...niveles].sort((a, b) => a.orden - b.orden);
  const ordenadosDesc = [...niveles].sort((a, b) => b.orden - a.orden);
  const ordenMasBajo = ordenadosAsc[0]?.orden ?? 1;
  const agregarNivel = (gondolaId: string, ordenDestino: number) => onAgregarNivel(gondolaId, ordenDestino, seccionId);

  // La columna de niveles se pinta con el nivel 1 arriba (usa `ordenadosAsc`, más abajo), pero la
  // regla de cm sigue acumulándose desde el piso — por eso este cálculo recorre `ordenadosDesc`
  // (el nivel de orden más alto primero, con el tickBottomPx más chico) para que el tick de altura
  // de cada nivel quede alineado con su fila sin importar en qué extremo del layout visual caiga.
  const geometriaPorNivel = new Map<string, { pxAlto: number; gapCm: number; tickBottomPx: number }>();
  let acumuladoPx = 10; // el hueco inferior para insertar un nivel al piso mide 10px (ver `.gap-lienzo`)
  for (const nivel of ordenadosDesc) {
    const gapCm = calcularGapCm(columna, nivel);
    const pxAlto = Math.max(gapCm * PX_POR_CM, ALTURA_MIN_NIVEL_PX);
    geometriaPorNivel.set(nivel.id, { pxAlto, gapCm, tickBottomPx: acumuladoPx });
    acumuladoPx += pxAlto + 10;
  }

  return (
    <div className="gondola-frame-lienzo__body">
      <div className="gondola-frame-lienzo__ruler">
        {ordenadosAsc.map((nivel) => (
          <div key={nivel.id} className="gondola-frame-lienzo__tick" style={{ bottom: geometriaPorNivel.get(nivel.id)!.tickBottomPx }}>
            <span>{nivel.alturaDesdePisoCm}</span>
          </div>
        ))}
      </div>

      <div className="gondola-frame-lienzo__niveles">
        {puedeEscribir && <GapInsercion gondolaId={gondola.id} ordenDestino={ordenMasBajo} onAgregarNivel={agregarNivel} />}
        {ordenadosAsc.map((nivel) => {
          const geometria = geometriaPorNivel.get(nivel.id)!;
          return (
            <div key={nivel.id}>
              <NivelFilaLienzo
                nivel={nivel}
                alturaPx={geometria.pxAlto}
                puedeEscribir={puedeEscribir}
                capacidad={(resolverCapacidad ?? ((n) => resolverCapacidadPorDefecto(n, anchoCm)))(nivel)}
                resolverDesborda={(posicion) => (resolverDesborda ?? resolverDesbordaPorDefecto)(posicion, geometria.gapCm)}
                resolverGanchos={resolverGanchos}
                posicionSeleccionadaId={posicionSeleccionadaId}
                resolverProducto={resolverProducto}
                onSeleccionarPosicion={props.onSeleccionarPosicion}
                onAbrirDetallePosicion={props.onAbrirDetallePosicion}
                onAbrirFichaPosicion={props.onAbrirFichaPosicion}
                onEditarNivel={props.onEditarNivel}
                onEliminarNivel={props.onEliminarNivel}
                onSoltarProductoEnNivel={props.onSoltarProductoEnNivel}
                onSoltarPosicionEnNivel={props.onSoltarPosicionEnNivel}
                onAsignarSkuPorDrop={props.onAsignarSkuPorDrop}
                onAgregarPosicionPendiente={props.onAgregarPosicionPendiente}
              />
              {puedeEscribir && <GapInsercion gondolaId={gondola.id} ordenDestino={nivel.orden + 1} onAgregarNivel={agregarNivel} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Hueco entre dos niveles (o en la punta/el piso) donde aparece un "+" para insertar un nivel ahí. */
function GapInsercion({
  gondolaId,
  ordenDestino,
  onAgregarNivel,
}: {
  gondolaId: string;
  ordenDestino: number;
  onAgregarNivel: (gondolaId: string, ordenDestino: number) => void;
}) {
  return (
    <div className="gondola-frame-lienzo__gap">
      <button
        type="button"
        className="gondola-frame-lienzo__gap-boton"
        title="Insertar nivel aquí"
        onClick={() => onAgregarNivel(gondolaId, ordenDestino)}
      >
        +
      </button>
    </div>
  );
}
