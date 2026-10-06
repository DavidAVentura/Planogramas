import { useState, type DragEvent, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type SyntheticEvent } from 'react';
import type { GondolaFrameLienzoProps } from '../GondolaFrameLienzo/GondolaFrameLienzo';
import type { CapacidadNivel, NivelLienzo, PosicionLienzo } from '../../../../domain/lienzo/lienzo.types';
import type { HojaSeccion } from '../../../../types/seccion';
import { distribuirNiveles } from '../../../../domain/lienzo/secciones.service';
import { calcularCapacidadNivel } from '../../../../domain/lienzo/capacidad.service';
import { PX_POR_CM } from '../constantesLienzo';
import './GondolaEscalaLienzo.css';

const TIPO_ARRASTRE_PRODUCTO = 'application/x-lienzo-producto';
const TIPO_ARRASTRE_POSICION = 'application/x-lienzo-posicion';
const PIE_CM = 30.48;
/** Niveles que se dibujan como tablero perforado (lo demás, como repisa). */
const TIPOS_PANEL = ['GANCHO', 'BARRA'];
/** Alto de dibujo cuando el producto no tiene alto registrado: fracción del espacio del nivel. */
const FRACCION_ALTO_SIN_DATO = 0.7;

type Tooltip = { nivelId: string; eje: 'horizontal' | 'vertical'; fijo: boolean } | null;

interface HojaDibujo {
  id: number | null;
  indice: number | null;
  xCm: number;
  yCm: number;
  anchoCm: number;
  altoCm: number;
  niveles: NivelLienzo[];
}

/** Color de una barra de uso: verde hasta 85 %, ámbar hasta 100 %, rojo si se pasa. Gris = sin dato. */
function claseUso(ratio: number | null): string {
  if (ratio === null) return 'sin-dato';
  if (ratio > 1) return 'excedido';
  if (ratio > 0.85) return 'justo';
  return 'ok';
}

const dos = (n: number) => String(n).padStart(2, '0');

/**
 * Detalle de góndola dibujado a escala real (estilo del prototipo de diseño): postes, regla en pies,
 * cada sección en su lugar y medida, niveles de ganchos sobre tablero perforado o de repisa con su
 * barra, y cada facing con la foto del producto. Conserva todas las interacciones del lienzo: "+"
 * entre niveles y entre productos, espacios pendientes con "?" para asignar SKU, arrastre desde el
 * catálogo y entre niveles, selección, doble clic y clic derecho.
 *
 * Cada nivel lleva dos barras de uso, solo con color: horizontal (ancho ocupado vs. disponible) a lo
 * largo de su base, y vertical (producto más alto × apilable vs. alto del nivel) en su borde derecho.
 * Al pasar el mouse o hacer clic se abre un tooltip con el detalle.
 */
export function GondolaEscalaLienzo(props: GondolaFrameLienzoProps) {
  const { gondola, onExpandir, expandida, puedeEscribir, onEditarGondola, onEliminarGondola, onMoverGondola, scale } = props;
  const [tooltip, setTooltip] = useState<Tooltip>(null);
  const [arrastrando, setArrastrando] = useState(false);

  // En el lienzo general el encabezado se arrastra para mover la góndola (mismo gesto que el marco
  // anterior); en el detalle de góndola no hace falta, pero no estorba.
  function onPointerDownEncabezado(e: ReactPointerEvent<HTMLDivElement>) {
    if (!puedeEscribir || expandida || (e.target as HTMLElement).closest('button')) return;
    const inicioX = e.clientX;
    const inicioY = e.clientY;
    const gx = gondola.x;
    const gy = gondola.y;
    setArrastrando(true);
    function onMove(ev: globalThis.PointerEvent) {
      onMoverGondola(gondola.id, gx + (ev.clientX - inicioX) / scale, gy + (ev.clientY - inicioY) / scale);
    }
    function onUp() {
      setArrastrando(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  const anchoCm = gondola.anchoCm;
  const altoCm = gondola.altoCm ?? gondola.estructura?.altoCm ?? 213;
  const estructura = gondola.estructura;
  const dividida = Boolean(estructura?.dividida && estructura.hojas.length);
  const primeraHojaId = estructura?.hojas[0]?.id ?? null;

  const hojas: HojaDibujo[] = dividida
    ? estructura!.hojas.map((h: HojaSeccion) => ({
        id: h.id,
        indice: h.indice,
        xCm: h.xCm,
        yCm: h.yCm,
        anchoCm: h.anchoCm,
        altoCm: h.altoCm,
        niveles: gondola.niveles.filter((n) => (n.seccionId ?? primeraHojaId) === h.id),
      }))
    : [{ id: null, indice: null, xCm: 0, yCm: 0, anchoCm, altoCm, niveles: gondola.niveles }];

  const marcas: { topPx: number; texto: string }[] = [];
  for (let pie = 1; pie * PIE_CM <= altoCm; pie++) marcas.push({ topPx: (altoCm - pie * PIE_CM) * PX_POR_CM, texto: `${pie}'` });

  return (
    <div
      className={`gondola-escala${arrastrando ? ' gondola-escala--arrastrando' : ''}`}
      style={{ left: gondola.x, top: gondola.y }}
      onClick={() => tooltip?.fijo && setTooltip(null)}
    >
      <div
        className={`gondola-escala__header${puedeEscribir && !expandida ? ' gondola-escala__header--movible' : ''}`}
        data-pan-blocker
        onPointerDown={onPointerDownEncabezado}
      >
        <span className="gondola-escala__nombre">{gondola.nombre}</span>
        <span className="gondola-escala__chip">
          {anchoCm} × {altoCm} cm
        </span>
        {dividida && <span className="gondola-escala__chip">{estructura!.hojas.length} secciones</span>}
        <span className="gondola-escala__acciones">
          {onExpandir && (
            <button
              type="button"
              className="gondola-escala__accion gondola-escala__accion--primaria"
              title={expandida ? 'Volver al lienzo' : 'Abrir detalle de la góndola'}
              aria-label={expandida ? 'Volver al lienzo' : `Abrir detalle de ${gondola.nombre}`}
              onClick={() => onExpandir(gondola.id)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={expandida ? 'M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7' : 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7'} />
              </svg>
            </button>
          )}
          {puedeEscribir && onEditarGondola && (
            <button type="button" className="gondola-escala__accion" title="Editar góndola" aria-label="Editar góndola" onClick={() => onEditarGondola(gondola.id)}>
              ✎
            </button>
          )}
          {puedeEscribir && onEliminarGondola && (
            <button type="button" className="gondola-escala__accion gondola-escala__accion--peligro" title="Eliminar góndola" aria-label="Eliminar góndola" onClick={() => onEliminarGondola(gondola.id)}>
              ×
            </button>
          )}
        </span>
      </div>

      <div className="gondola-escala__cuerpo">
        <div className="gondola-escala__regla" style={{ height: altoCm * PX_POR_CM }} aria-hidden="true">
          {marcas.map((m) => (
            <div key={m.texto} className="gondola-escala__marca" style={{ top: m.topPx }}>
              <span>{m.texto}</span>
            </div>
          ))}
        </div>
        <div className="gondola-escala__poste" style={{ height: altoCm * PX_POR_CM }} aria-hidden="true" />
        <div className="gondola-escala__mueble" style={{ width: anchoCm * PX_POR_CM, height: altoCm * PX_POR_CM }}>
          {hojas.map((hoja) => (
            <SeccionEscala key={hoja.id ?? 'unica'} hoja={hoja} altoGondolaCm={altoCm} props={props} tooltip={tooltip} setTooltip={setTooltip} />
          ))}
        </div>
        <div className="gondola-escala__poste" style={{ height: altoCm * PX_POR_CM }} aria-hidden="true" />
      </div>
    </div>
  );
}

function SeccionEscala({
  hoja,
  altoGondolaCm,
  props,
  tooltip,
  setTooltip,
}: {
  hoja: HojaDibujo;
  altoGondolaCm: number;
  props: GondolaFrameLienzoProps;
  tooltip: Tooltip;
  setTooltip: (t: Tooltip) => void;
}) {
  const { gondola, puedeEscribir, onAgregarNivel, onSeleccionarSeccion, seccionSeleccionadaId } = props;
  const visual = [...hoja.niveles].sort((a, b) => a.orden - b.orden);
  const pisoCm = altoGondolaCm - (hoja.yCm + hoja.altoCm);
  const techoCm = altoGondolaCm - hoja.yCm;
  const { franjas } = distribuirNiveles(visual, pisoCm, techoCm);
  const seleccionada = hoja.id !== null && seccionSeleccionadaId === hoja.id;
  const pxDesdeArriba = (alturaCm: number) => (techoCm - alturaCm) * PX_POR_CM;

  return (
    <div
      className={`gondola-escala__seccion${hoja.id !== null ? ' gondola-escala__seccion--dividida' : ''}${seleccionada ? ' gondola-escala__seccion--seleccionada' : ''}`}
      style={{ left: hoja.xCm * PX_POR_CM, top: hoja.yCm * PX_POR_CM, width: hoja.anchoCm * PX_POR_CM, height: hoja.altoCm * PX_POR_CM }}
      onClick={() => hoja.id !== null && onSeleccionarSeccion?.(hoja.id)}
    >
      {franjas.map((f, i) => (
        <NivelEscala
          key={f.nivel.id}
          nivel={f.nivel}
          topPx={pxDesdeArriba(f.techoCm)}
          altoCm={f.techoCm - f.baseCm}
          anchoCm={hoja.anchoCm}
          props={props}
          tooltip={tooltip}
          setTooltip={setTooltip}
          esPrimero={i === 0}
        />
      ))}

      {puedeEscribir &&
        franjas.map((f, i) => (
          <GapNivel
            key={`gap-${f.nivel.id}`}
            topPx={pxDesdeArriba(f.techoCm)}
            posicion={i === 0 ? 'inicio' : 'medio'}
            ayuda={i === 0 ? 'Insertar nivel arriba de todo' : `Insertar nivel entre el ${i} y el ${i + 1}`}
            onClick={() => onAgregarNivel(gondola.id, f.nivel.orden, hoja.id)}
          />
        ))}
      {puedeEscribir && franjas.length > 0 && (
        <GapNivel
          topPx={pxDesdeArriba(franjas[franjas.length - 1].baseCm)}
          posicion="fin"
          ayuda="Insertar nivel abajo"
          onClick={() => onAgregarNivel(gondola.id, franjas[franjas.length - 1].nivel.orden + 1, hoja.id)}
        />
      )}
      {puedeEscribir && franjas.length === 0 && (
        <button
          type="button"
          className="gondola-escala__vacia"
          onClick={(e) => {
            e.stopPropagation();
            onAgregarNivel(gondola.id, 1, hoja.id);
          }}
        >
          + Agregar nivel
        </button>
      )}

      {hoja.indice !== null && (
        <button
          type="button"
          className="gondola-escala__etiqueta"
          title={`Seleccionar sección ${hoja.indice}`}
          onClick={(e) => {
            e.stopPropagation();
            onSeleccionarSeccion?.(hoja.id!);
          }}
        >
          S{hoja.indice}
        </button>
      )}
    </div>
  );
}

function GapNivel({ topPx, posicion, ayuda, onClick }: { topPx: number; posicion: 'inicio' | 'medio' | 'fin'; ayuda: string; onClick: () => void }) {
  const desplazamiento = posicion === 'inicio' ? 0 : posicion === 'fin' ? -12 : -6;
  return (
    <div className="gondola-escala__gap-nivel" style={{ top: topPx + desplazamiento }}>
      <span className="gondola-escala__gap-linea gondola-escala__gap-linea--h" aria-hidden="true" />
      <button
        type="button"
        className="gondola-escala__gap-boton"
        title="Insertar nivel aquí"
        aria-label={ayuda}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        +
      </button>
    </div>
  );
}

function NivelEscala({
  nivel,
  topPx,
  altoCm,
  anchoCm,
  props,
  tooltip,
  setTooltip,
  esPrimero,
}: {
  nivel: NivelLienzo;
  topPx: number;
  altoCm: number;
  anchoCm: number;
  props: GondolaFrameLienzoProps;
  tooltip: Tooltip;
  setTooltip: (t: Tooltip) => void;
  esPrimero: boolean;
}) {
  const { puedeEscribir, resolverProducto, resolverCapacidad, resolverGanchos, posicionSeleccionadaId } = props;
  const panel = TIPOS_PANEL.includes(nivel.tipoAccesorio);
  const altoPx = altoCm * PX_POR_CM;

  // ── Uso horizontal: el del backend (ancho ocupado vs. disponible del nivel).
  const capacidad: CapacidadNivel = (resolverCapacidad ?? ((n) => calcularCapacidadNivel(n, anchoCm)))(nivel);
  const ratioH = capacidad.disponibleCm > 0 ? capacidad.ocupadoCm / capacidad.disponibleCm : null;

  // ── Uso vertical: el producto más alto (× apilable) vs. el alto del nivel.
  const alturas = nivel.posiciones
    .filter((p) => p.sku)
    .map((p) => {
      const alto = resolverProducto(p.sku!)?.altoRealCm ?? null;
      return { sku: p.sku!, altoTotal: alto === null ? null : alto * Math.max(1, p.apilable) };
    });
  const conAlto = alturas.filter((a) => a.altoTotal !== null) as { sku: string; altoTotal: number }[];
  const masAlto = conAlto.reduce<{ sku: string; altoTotal: number } | null>((max, a) => (!max || a.altoTotal > max.altoTotal ? a : max), null);
  const sinAlto = alturas.length - conAlto.length;
  const ratioV = masAlto && altoCm > 0 ? masAlto.altoTotal / altoCm : null;

  const skuSeleccionado = posicionSeleccionadaId ? nivel.posiciones.find((p) => p.id === posicionSeleccionadaId)?.sku : null;

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const sku = e.dataTransfer.getData(TIPO_ARRASTRE_PRODUCTO);
    if (sku) return props.onSoltarProductoEnNivel(nivel.id, sku);
    const posicionId = e.dataTransfer.getData(TIPO_ARRASTRE_POSICION);
    if (posicionId) props.onSoltarPosicionEnNivel(posicionId, nivel.id);
  }

  function abrir(eje: 'horizontal' | 'vertical', fijo: boolean) {
    return (e: SyntheticEvent) => {
      e.stopPropagation();
      if (fijo) setTooltip(tooltip?.fijo && tooltip.nivelId === nivel.id && tooltip.eje === eje ? null : { nivelId: nivel.id, eje, fijo: true });
      else if (!tooltip?.fijo) setTooltip({ nivelId: nivel.id, eje, fijo: false });
    };
  }
  const cerrarHover = () => !tooltip?.fijo && setTooltip(null);
  const tooltipAqui = tooltip?.nivelId === nivel.id ? tooltip : null;

  return (
    <div
      className={`gondola-escala__nivel gondola-escala__nivel--${panel ? 'panel' : 'repisa'}${esPrimero ? ' gondola-escala__nivel--primero' : ''}`}
      style={{ top: topPx, height: altoPx, backgroundSize: `${2.54 * PX_POR_CM}px ${2.54 * PX_POR_CM}px` }}
      onDragOver={puedeEscribir ? (e) => e.preventDefault() : undefined}
      onDrop={puedeEscribir ? onDrop : undefined}
      title={`Nivel ${nivel.orden} · ${nivel.tipoAccesorio.toLowerCase()}${nivel.notas ? ` · ${nivel.notas}` : ''}`}
    >
      <div className={`gondola-escala__pista gondola-escala__pista--${panel ? 'arriba' : 'abajo'}`}>
        {puedeEscribir && <GapPosicion nivelId={nivel.id} orden={1} borde="inicio" props={props} />}
        {nivel.posiciones.map((p, i) => (
          <PosicionEscala
            key={p.id}
            posicion={p}
            altoNivelPx={altoPx}
            seleccionada={p.id === posicionSeleccionadaId}
            mismoSku={Boolean(skuSeleccionado && p.sku === skuSeleccionado && p.id !== posicionSeleccionadaId)}
            props={props}
            ganchos={resolverGanchos?.(p.id)}
            siguienteGap={puedeEscribir ? <GapPosicion nivelId={nivel.id} orden={i + 2} borde={i === nivel.posiciones.length - 1 ? 'fin' : 'medio'} props={props} /> : null}
          />
        ))}
      </div>

      {!panel && <div className="gondola-escala__repisa" aria-hidden="true" />}

      {puedeEscribir && (
        <span className="gondola-escala__nivel-acciones">
          <button
            type="button"
            title="Editar nivel"
            aria-label="Editar nivel"
            onClick={(e) => {
              e.stopPropagation();
              props.onEditarNivel(nivel.id);
            }}
          >
            ✎
          </button>
          <button
            type="button"
            title="Eliminar nivel"
            aria-label="Eliminar nivel"
            onClick={(e) => {
              e.stopPropagation();
              props.onEliminarNivel(nivel.id);
            }}
          >
            ×
          </button>
        </span>
      )}

      {/* Barras de uso (solo color). Pasar el mouse o hacer clic abre el detalle. */}
      <button
        type="button"
        className={`gondola-escala__uso gondola-escala__uso--h gondola-escala__uso--${claseUso(ratioH)}`}
        aria-label="Uso horizontal del nivel"
        onMouseEnter={abrir('horizontal', false)}
        onMouseLeave={cerrarHover}
        onFocus={abrir('horizontal', false)}
        onBlur={cerrarHover}
        onClick={abrir('horizontal', true)}
      >
        <span style={{ width: `${Math.min(1, ratioH ?? 0) * 100}%` }} />
      </button>
      <button
        type="button"
        className={`gondola-escala__uso gondola-escala__uso--v gondola-escala__uso--${claseUso(ratioV)}`}
        aria-label="Uso vertical del nivel"
        onMouseEnter={abrir('vertical', false)}
        onMouseLeave={cerrarHover}
        onFocus={abrir('vertical', false)}
        onBlur={cerrarHover}
        onClick={abrir('vertical', true)}
      >
        <span style={{ height: `${Math.min(1, ratioV ?? 0) * 100}%` }} />
      </button>

      {tooltipAqui && (
        <div className={`gondola-escala__tooltip gondola-escala__tooltip--${tooltipAqui.eje}`} role="tooltip" onClick={(e) => e.stopPropagation()}>
          {tooltipAqui.eje === 'horizontal' ? (
            <>
              <strong>Uso horizontal · nivel {nivel.orden}</strong>
              <span>
                Ocupado {capacidad.ocupadoCm.toFixed(1)} de {capacidad.disponibleCm.toFixed(1)} cm
                {ratioH !== null && ` (${Math.round(ratioH * 100)} %)`}
              </span>
              <span className={capacidad.sobreOcupado ? 'gondola-escala__tooltip-alerta' : undefined}>
                {capacidad.sobreOcupado ? `Se pasa por ${Math.abs(capacidad.libreCm).toFixed(1)} cm` : `Libre ${capacidad.libreCm.toFixed(1)} cm`}
              </span>
              <span>{nivel.posiciones.length} posiciones</span>
            </>
          ) : (
            <>
              <strong>Uso vertical · nivel {nivel.orden}</strong>
              <span>Alto del nivel {altoCm.toFixed(1)} cm</span>
              {masAlto ? (
                <span className={ratioV !== null && ratioV > 1 ? 'gondola-escala__tooltip-alerta' : undefined}>
                  Más alto: {masAlto.sku} · {masAlto.altoTotal.toFixed(1)} cm{ratioV !== null && ` (${Math.round(ratioV * 100)} %)`}
                </span>
              ) : (
                <span>Sin productos con alto registrado</span>
              )}
              {sinAlto > 0 && <span>{sinAlto} producto(s) sin alto registrado</span>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function GapPosicion({ nivelId, orden, borde, props }: { nivelId: string; orden: number; borde: 'inicio' | 'medio' | 'fin'; props: GondolaFrameLienzoProps }) {
  return (
    <div className={`gondola-escala__gap-pos gondola-escala__gap-pos--${borde}`}>
      <span className="gondola-escala__gap-linea gondola-escala__gap-linea--v" aria-hidden="true" />
      <button
        type="button"
        className="gondola-escala__gap-boton"
        title="Insertar espacio aquí"
        aria-label={`Insertar espacio en el lugar ${orden}`}
        onClick={(e) => {
          e.stopPropagation();
          props.onAgregarPosicionPendiente(nivelId, orden);
        }}
      >
        +
      </button>
    </div>
  );
}

function PosicionEscala({
  posicion,
  altoNivelPx,
  seleccionada,
  mismoSku,
  props,
  ganchos,
  siguienteGap,
}: {
  posicion: PosicionLienzo;
  altoNivelPx: number;
  seleccionada: boolean;
  mismoSku: boolean;
  props: GondolaFrameLienzoProps;
  ganchos: number[] | undefined;
  siguienteGap: ReactNode;
}) {
  const { puedeEscribir } = props;
  const anchoPx = Math.max(posicion.anchoCm * PX_POR_CM, 14);
  const pendiente = posicion.modo === 'PENDIENTE' || !posicion.sku;
  const producto = posicion.sku ? props.resolverProducto(posicion.sku) : undefined;
  const altoReal = producto?.altoRealCm ?? null;
  const altoPx = Math.max(
    14,
    Math.min(altoNivelPx - 10, altoReal !== null ? altoReal * Math.max(1, posicion.apilable) * PX_POR_CM : altoNivelPx * FRACCION_ALTO_SIN_DATO),
  );
  const clases = ['gondola-escala__posicion', seleccionada && 'gondola-escala__posicion--seleccionada', mismoSku && 'gondola-escala__posicion--mismo-sku']
    .filter(Boolean)
    .join(' ');

  const comunes = {
    'data-pan-blocker': true,
    onClick: (e: MouseEvent) => {
      e.stopPropagation();
      props.onSeleccionarPosicion(posicion.id);
    },
    onDoubleClick: (e: MouseEvent) => {
      e.stopPropagation();
      props.onAbrirDetallePosicion(posicion.id);
    },
  };

  if (pendiente) {
    return (
      <>
        <div
          {...comunes}
          className={`${clases} gondola-escala__posicion--pendiente`}
          style={{ width: anchoPx, height: Math.min(altoPx, altoNivelPx - 10) }}
          onDragOver={puedeEscribir ? (e) => e.preventDefault() : undefined}
          onDrop={
            puedeEscribir
              ? (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const sku = e.dataTransfer.getData(TIPO_ARRASTRE_PRODUCTO);
                  if (sku) props.onAsignarSkuPorDrop(posicion.id, sku);
                }
              : undefined
          }
          title={posicion.nombreDetectado ? `Detectado: ${posicion.nombreDetectado} · clic para asignar SKU` : 'Espacio pendiente · clic para asignar SKU'}
        >
          <span className="gondola-escala__pendiente-icono">?</span>
          {ganchos && <span className="gondola-escala__gancho">{dos(ganchos[0])}</span>}
        </div>
        {siguienteGap}
      </>
    );
  }

  return (
    <>
      <div
        {...comunes}
        className={clases}
        style={{ width: anchoPx, height: altoPx }}
        draggable={puedeEscribir}
        onDragStart={(e) => {
          e.dataTransfer.setData(TIPO_ARRASTRE_POSICION, posicion.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          props.onSeleccionarPosicion(posicion.id);
          if (posicion.sku) props.onAbrirFichaPosicion(posicion.sku);
        }}
        title={`${producto?.nombre ?? posicion.sku} · ${posicion.sku} · ${posicion.facings} facing${posicion.facings === 1 ? '' : 's'}`}
      >
        {Array.from({ length: Math.max(1, posicion.facings) }).map((_, i) => (
          <span key={i} className="gondola-escala__facing">
            {producto?.imagenUrl ? (
              <img src={producto.imagenUrl} alt="" draggable={false} />
            ) : (
              <span className="gondola-escala__facing-sku">{posicion.sku}</span>
            )}
            {ganchos?.[i] !== undefined && <span className="gondola-escala__gancho">{dos(ganchos[i])}</span>}
          </span>
        ))}
        {posicion.apilable > 1 && <span className="gondola-escala__apilable">×{posicion.apilable}</span>}
      </div>
      {siguienteGap}
    </>
  );
}
