import { useState, type KeyboardEvent } from 'react';
import { calcularAnchoAsignado, calcularCapacidadMaxima, calcularMinEstetico } from '../../../../utils/posicionCalculos';
import {
  DECISIONES_POSICION,
  MODOS_POSICION,
  PERFILES_REDONDEO,
  type PosicionCambiosCompletos,
  type PosicionConProducto,
} from '../../../../types/posicion';
import type { DimensionesProducto } from '../../../../types/catalogo';
import type { SkuVersion, UbicacionSku } from '../../../../types/skuVersion';

export interface PosicionesSkuProps {
  sku: SkuVersion;
  posicionesPorId: Record<number, PosicionConProducto>;
  /** Números de gancho calculados por posición, para avisar si uno ya lo usa otra posición. */
  ganchosPorPosicion: Record<string, number[]>;
  puedeEscribir: boolean;
  onEditarPosicion: (posicion: PosicionConProducto, cambios: PosicionCambiosCompletos) => Promise<boolean>;
  onEditarDimensiones: (sku: string, dimensiones: DimensionesProducto) => Promise<boolean>;
  onIrAPosicion: (posicionId: number) => void;
}

const dos = (n: number) => String(n).padStart(2, '0');
const etiquetaUbicacion = (u: UbicacionSku) => `${u.gondola}${u.seccion ? ` · S${u.seccion}` : ''} · N${u.nivel}`;

/**
 * Sub-tabla de "SKU en la versión": una fila por cada posición del SKU, editable campo por campo
 * (cada cambio se guarda al salir del campo con PATCH /posiciones/:id). Capacidad, ancho asignado
 * y mín. estético se recalculan igual que en el drawer de posición.
 */
export function PosicionesSku(props: PosicionesSkuProps) {
  return (
    <div className="posiciones-sku">
      <table>
        <thead>
          <tr>
            <th>Ubicación</th>
            <th className="num">Facings</th>
            <th className="num">Apilable</th>
            <th className="num">Und./facing</th>
            <th className="num">Capac.</th>
            <th className="num">Ancho cm</th>
            <th>Modo</th>
            <th>Ganchos</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {props.sku.ubicaciones.map((u) => {
            const posicion = props.posicionesPorId[u.posicionId];
            return posicion ? (
              <FilaPosicion key={u.posicionId} {...props} ubicacion={u} posicion={posicion} />
            ) : (
              <tr key={u.posicionId}>
                <td colSpan={9} className="detalle-gondola-panel__ayuda">{etiquetaUbicacion(u)} · cargando…</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FilaPosicion({ ubicacion, posicion, puedeEscribir, ganchosPorPosicion, onEditarPosicion, onEditarDimensiones, onIrAPosicion }: PosicionesSkuProps & { ubicacion: UbicacionSku; posicion: PosicionConProducto }) {
  const [masAbierto, setMasAbierto] = useState(false);

  /** Cambiar facings, apilable o unidades recalcula capacidad, mín. estético y (facings) el ancho. */
  function cambiarCantidades(cambio: { facings_horizontal?: number; cantidad_apilable?: number; unidades_por_facing?: number }) {
    const facings = cambio.facings_horizontal ?? posicion.facings_horizontal;
    const apilable = cambio.cantidad_apilable ?? posicion.cantidad_apilable;
    const unidades = cambio.unidades_por_facing ?? posicion.unidades_por_facing;
    const capacidad = calcularCapacidadMaxima(facings, apilable, unidades);
    const cambios: PosicionCambiosCompletos = {
      ...cambio,
      capacidad_maxima: capacidad,
      min_estetico: calcularMinEstetico(facings, unidades, capacidad),
    };
    if (cambio.facings_horizontal !== undefined) {
      cambios.ancho_asignado_cm = calcularAnchoAsignado(facings, posicion.producto?.ancho_cm ?? null, posicion.ancho_asignado_cm);
    }
    return onEditarPosicion(posicion, cambios);
  }

  const editar = (cambios: PosicionCambiosCompletos) => onEditarPosicion(posicion, cambios);

  return (
    <>
      <tr>
        <td>
          <button type="button" className="posiciones-sku__ubicacion" onClick={() => onIrAPosicion(posicion.id)} title="Ver en la góndola">
            {etiquetaUbicacion(ubicacion)}
          </button>
        </td>
        <td className="num">
          <CampoEntero valor={posicion.facings_horizontal} minimo={1} editable={puedeEscribir} etiqueta="Facings horizontales" onAplicar={(v) => cambiarCantidades({ facings_horizontal: v })} />
        </td>
        <td className="num">
          <CampoEntero valor={posicion.cantidad_apilable} minimo={1} editable={puedeEscribir} etiqueta="Cantidad apilable" onAplicar={(v) => cambiarCantidades({ cantidad_apilable: v })} />
        </td>
        <td className="num">
          <CampoEntero valor={posicion.unidades_por_facing} minimo={1} editable={puedeEscribir} etiqueta="Unidades por facing" onAplicar={(v) => cambiarCantidades({ unidades_por_facing: v })} />
        </td>
        <td className="num" title="Facings × apilable × unidades por facing">{posicion.capacidad_maxima ?? '—'}</td>
        <td className="num">
          <CampoDecimal valor={posicion.ancho_asignado_cm} editable={puedeEscribir} etiqueta="Ancho asignado (cm)" onAplicar={(v) => editar({ ancho_asignado_cm: v })} />
        </td>
        <td>
          {puedeEscribir ? (
            <select aria-label="Modo" value={posicion.modo} onChange={(e) => editar({ modo: e.target.value as PosicionConProducto['modo'] })}>
              {MODOS_POSICION.map((m) => <option key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</option>)}
            </select>
          ) : (
            posicion.modo
          )}
        </td>
        <td>
          <ChipsGanchos posicion={posicion} calculados={ganchosPorPosicion[posicion.id] ?? []} ganchosPorPosicion={ganchosPorPosicion} editable={puedeEscribir} onAplicar={(ganchos) => editar({ ganchos })} />
        </td>
        <td>
          <button type="button" className="detalle-gondola-panel__link" aria-expanded={masAbierto} onClick={() => setMasAbierto((v) => !v)}>
            {masAbierto ? 'Menos' : 'Más'}
          </button>
        </td>
      </tr>
      {masAbierto && (
        <tr className="posiciones-sku__mas">
          <td colSpan={9}>
            <MasCampos posicion={posicion} editable={puedeEscribir} onEditar={editar} onEditarDimensiones={onEditarDimensiones} />
          </td>
        </tr>
      )}
    </>
  );
}

function MasCampos({ posicion, editable, onEditar, onEditarDimensiones }: { posicion: PosicionConProducto; editable: boolean; onEditar: (c: PosicionCambiosCompletos) => Promise<boolean>; onEditarDimensiones: PosicionesSkuProps['onEditarDimensiones'] }) {
  const [observaciones, setObservaciones] = useState<string | null>(null);

  return (
    <div className="posiciones-sku__mas-contenido">
      <div className="posiciones-sku__mas-grupo">
        <label>
          <span>Decisión</span>
          <select disabled={!editable} value={posicion.decision} onChange={(e) => onEditar({ decision: e.target.value as PosicionConProducto['decision'] })}>
            {DECISIONES_POSICION.map((d) => <option key={d} value={d}>{d === 'ACTIVO' ? 'Activo' : 'Inactivo'}</option>)}
          </select>
        </label>
        <label>
          <span>Perfil de redondeo</span>
          <select disabled={!editable} value={posicion.perfil_redondeo} onChange={(e) => onEditar({ perfil_redondeo: e.target.value as PosicionConProducto['perfil_redondeo'] })}>
            {PERFILES_REDONDEO.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="posiciones-sku__check">
          <input type="checkbox" disabled={!editable} checked={posicion.cross_externo} onChange={(e) => onEditar({ cross_externo: e.target.checked })} />
          Cross externo
        </label>
        <label className="posiciones-sku__check">
          <input type="checkbox" disabled={!editable} checked={posicion.montar_en_display} onChange={(e) => onEditar({ montar_en_display: e.target.checked })} />
          Montar en display
        </label>
      </div>
      <label className="posiciones-sku__observaciones">
        <span>Observaciones</span>
        <input
          type="text"
          maxLength={500}
          disabled={!editable}
          value={observaciones ?? posicion.observaciones ?? ''}
          onChange={(e) => setObservaciones(e.target.value)}
          onBlur={() => {
            if (observaciones === null) return;
            const texto = observaciones.trim();
            setObservaciones(null);
            if (texto !== (posicion.observaciones ?? '')) onEditar({ observaciones: texto || null });
          }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
      </label>
      {posicion.sku && <DimensionesMontaje sku={posicion.sku} posicion={posicion} editable={editable} onEditarDimensiones={onEditarDimensiones} />}
    </div>
  );
}

function DimensionesMontaje({ sku, posicion, editable, onEditarDimensiones }: { sku: string; posicion: PosicionConProducto; editable: boolean; onEditarDimensiones: PosicionesSkuProps['onEditarDimensiones'] }) {
  const inicial = () => ({
    ancho_cm: posicion.producto?.ancho_cm != null ? String(posicion.producto.ancho_cm) : '',
    alto_cm: posicion.producto?.alto_cm != null ? String(posicion.producto.alto_cm) : '',
    profundidad_cm: posicion.producto?.profundidad_cm != null ? String(posicion.producto.profundidad_cm) : '',
  });
  const [medidas, setMedidas] = useState(inicial);
  const [enviando, setEnviando] = useState(false);
  const original = inicial();
  const completas = [medidas.ancho_cm, medidas.alto_cm, medidas.profundidad_cm].every((v) => Number(v) > 0);
  const cambiaron = medidas.ancho_cm !== original.ancho_cm || medidas.alto_cm !== original.alto_cm || medidas.profundidad_cm !== original.profundidad_cm;

  async function guardar() {
    setEnviando(true);
    await onEditarDimensiones(sku, { ancho_cm: Number(medidas.ancho_cm), alto_cm: Number(medidas.alto_cm), profundidad_cm: Number(medidas.profundidad_cm) });
    setEnviando(false);
  }

  const campo = (clave: keyof typeof medidas, etiqueta: string) => (
    <label>
      <span>{etiqueta}</span>
      <input type="number" inputMode="decimal" min={0} step="0.1" disabled={!editable} value={medidas[clave]} onChange={(e) => setMedidas((m) => ({ ...m, [clave]: e.target.value }))} />
    </label>
  );

  return (
    <div className="posiciones-sku__dimensiones">
      <span className="posiciones-sku__subtitulo">Dimensiones de montaje del producto (cm)</span>
      <div className="posiciones-sku__mas-grupo">
        {campo('ancho_cm', 'Ancho')}
        {campo('alto_cm', 'Alto')}
        {campo('profundidad_cm', 'Profundidad')}
        {editable && (
          <button type="button" className="detalle-gondola-panel__link" disabled={!completas || !cambiaron || enviando} onClick={guardar}>
            {enviando ? 'Guardando…' : 'Guardar medidas'}
          </button>
        )}
      </div>
      <span className="detalle-gondola-panel__ayuda">Son del producto: aplican a todas sus ubicaciones, en todos los planogramas.</span>
    </div>
  );
}

/**
 * Ganchos guardados a mano: chips con "×" para quitar y un campo para agregar con Enter. Si la
 * posición no tiene ganchos guardados, se muestran los calculados (solo lectura). Quitar el
 * último gancho vuelve la posición a numeración automática.
 */
function ChipsGanchos({ posicion, calculados, ganchosPorPosicion, editable, onAplicar }: { posicion: PosicionConProducto; calculados: number[]; ganchosPorPosicion: Record<string, number[]>; editable: boolean; onAplicar: (ganchos: number[] | null) => void }) {
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const manuales = posicion.ganchos;

  if (!manuales?.length) {
    return (
      <span className="posiciones-sku__ganchos posiciones-sku__ganchos--auto" title="Calculados automáticamente">
        {calculados.length ? calculados.map(dos).join(' · ') : '—'}
      </span>
    );
  }

  function agregar() {
    const n = Number(texto.trim());
    if (!Number.isInteger(n) || n < 1) return setError('Número entero mayor que 0');
    if (manuales!.includes(n)) return setError('Ya está en la lista');
    const otra = Object.entries(ganchosPorPosicion).find(([id, gs]) => Number(id) !== posicion.id && gs.includes(n));
    if (otra) return setError(`El gancho ${n} ya lo usa otra posición`);
    setError(null);
    setTexto('');
    onAplicar([...manuales!, n].sort((a, b) => a - b));
  }

  function quitar(n: number) {
    const resto = manuales!.filter((g) => g !== n);
    onAplicar(resto.length ? resto : null);
  }

  return (
    <div className="posiciones-sku__ganchos">
      {manuales.map((g) => (
        <span key={g} className="posiciones-sku__chip">
          {dos(g)}
          {editable && (
            <button type="button" aria-label={`Quitar gancho ${g}`} onClick={() => quitar(g)}>×</button>
          )}
        </span>
      ))}
      {editable && (
        <input
          type="text"
          inputMode="numeric"
          aria-label="Agregar gancho"
          placeholder="+"
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setError(null); }}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (texto.trim()) agregar();
          }}
        />
      )}
      {error && <span className="posiciones-sku__error">{error}</span>}
    </div>
  );
}

function CampoEntero({ valor, minimo, editable, etiqueta, onAplicar }: { valor: number; minimo: number; editable: boolean; etiqueta: string; onAplicar: (v: number) => void }) {
  return <CampoNumero valor={valor} editable={editable} etiqueta={etiqueta} valido={(v) => Number.isInteger(v) && v >= minimo} onAplicar={onAplicar} />;
}

function CampoDecimal({ valor, editable, etiqueta, onAplicar }: { valor: number; editable: boolean; etiqueta: string; onAplicar: (v: number) => void }) {
  return <CampoNumero valor={valor} editable={editable} etiqueta={etiqueta} valido={(v) => v > 0} onAplicar={onAplicar} />;
}

/** Input numérico que guarda al salir (o con Enter); si el valor no es válido vuelve al anterior. */
function CampoNumero({ valor, editable, etiqueta, valido, onAplicar }: { valor: number; editable: boolean; etiqueta: string; valido: (v: number) => boolean; onAplicar: (v: number) => void }) {
  const [borrador, setBorrador] = useState<string | null>(null);

  function confirmar() {
    if (borrador === null) return;
    const v = Number(borrador.trim());
    setBorrador(null);
    if (borrador.trim() !== '' && Number.isFinite(v) && valido(v) && v !== valor) onAplicar(v);
  }

  if (!editable) return <span>{valor}</span>;
  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label={etiqueta}
      value={borrador ?? String(valor)}
      onChange={(e) => setBorrador(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}
