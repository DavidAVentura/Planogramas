import { useMemo, useState, type KeyboardEvent } from 'react';
import { Button } from '../../../ui/Button/Button';
import { nodoQueControla, rectangulosDeNodos } from '../../../../domain/lienzo/secciones.service';
import type { GondolaListItem } from '../../../../types/gondola';
import type { Nivel } from '../../../../types/nivel';
import type { DireccionSeccion, EstructuraSecciones } from '../../../../types/seccion';
import type { SkuMinMaxCambios, SkusDeVersion, SkuVersion } from '../../../../types/skuVersion';
import './DetalleGondolaPanel.css';

interface DetalleGondolaPanelProps {
  gondola: GondolaListItem;
  estructura: EstructuraSecciones | undefined;
  niveles: Nivel[];
  /** Cantidad de posiciones por nivel (para saber si una sección se puede quitar). */
  posicionesPorNivelId: Record<number, number>;
  puedeEscribir: boolean;
  seccionSeleccionadaId: number | null;
  onSeleccionarSeccion: (seccionId: number) => void;
  onDividir: (direccion: DireccionSeccion, seccionId: number | null) => void;
  onRedimensionar: (nodoId: number, tamCm: number) => void;
  onQuitarSeccion: (seccionId: number) => void;
  onAgregarNivel: (seccionId: number | null, anchoCm: number) => void;
  skus: SkusDeVersion | null;
  onEditarSku: (sku: string, cambios: SkuMinMaxCambios) => void;
  onIrAPosicion: (posicionId: number) => void;
  mostrarGanchos: boolean;
  onAlternarGanchos: () => void;
}

const dos = (n: number) => String(n).padStart(2, '0');

/**
 * Panel lateral del detalle de góndola: pestaña "Estructura" (dividir en secciones, medidas,
 * niveles por sección) y pestaña "SKU en la versión" (totales por SKU sumando todas sus
 * ubicaciones, mín./máx. editables una vez por SKU y ganchos calculados).
 */
export function DetalleGondolaPanel(props: DetalleGondolaPanelProps) {
  const [pestana, setPestana] = useState<'estructura' | 'skus'>('estructura');
  const alertas = (props.skus?.skus ?? []).filter((s) => s.alertas.length > 0).length;

  return (
    <aside className="detalle-gondola-panel" aria-label="Detalle de la góndola">
      <div className="detalle-gondola-panel__tabs" role="tablist">
        <button type="button" role="tab" aria-selected={pestana === 'estructura'} className="detalle-gondola-panel__tab" onClick={() => setPestana('estructura')}>
          Estructura
        </button>
        <button type="button" role="tab" aria-selected={pestana === 'skus'} className="detalle-gondola-panel__tab" onClick={() => setPestana('skus')}>
          SKU en la versión
          {alertas > 0 && <span className="detalle-gondola-panel__contador detalle-gondola-panel__contador--alerta">{alertas}</span>}
        </button>
      </div>

      <label className="detalle-gondola-panel__ganchos">
        <input type="checkbox" checked={props.mostrarGanchos} onChange={props.onAlternarGanchos} />
        Mostrar números de gancho
        {props.skus && <span className="detalle-gondola-panel__ayuda">({props.skus.totalGanchos} en la versión)</span>}
      </label>

      <div className="detalle-gondola-panel__contenido">
        {pestana === 'estructura' ? <PestanaEstructura {...props} /> : <PestanaSkus {...props} />}
      </div>
    </aside>
  );
}

// ─── Estructura ──────────────────────────────────────────────────────────────

function PestanaEstructura(props: DetalleGondolaPanelProps) {
  const { gondola, estructura, puedeEscribir } = props;
  const dividida = Boolean(estructura?.dividida && estructura.raiz);

  if (!dividida) {
    return (
      <div className="detalle-gondola-panel__bloque">
        <p className="detalle-gondola-panel__texto">
          Esta góndola no está dividida: sus niveles ocupan todo el ancho ({gondola.ancho_cm} cm). Divídela si una parte tiene
          niveles distintos a otra (por ejemplo, ganchos en columnas arriba y repisas abajo).
        </p>
        {puedeEscribir && (
          <div className="detalle-gondola-panel__acciones">
            <Button variante="outline" onClick={() => props.onDividir('COLUMNAS', null)}>Dividir en columnas</Button>
            <Button variante="outline" onClick={() => props.onDividir('FILAS', null)}>Dividir arriba / abajo</Button>
          </div>
        )}
      </div>
    );
  }

  const raiz = estructura!.raiz!;
  const hojas = estructura!.hojas;
  const hoja = hojas.find((h) => h.id === props.seccionSeleccionadaId) ?? null;

  return (
    <div className="detalle-gondola-panel__bloque">
      <div className="detalle-gondola-panel__chips" role="group" aria-label="Secciones">
        {hojas.map((h) => (
          <button
            key={h.id}
            type="button"
            aria-pressed={h.id === hoja?.id}
            className="detalle-gondola-panel__chip"
            onClick={() => props.onSeleccionarSeccion(h.id)}
          >
            S{h.indice}
          </button>
        ))}
      </div>

      {!hoja ? (
        <p className="detalle-gondola-panel__texto">Toca una sección (en la góndola o arriba) para dividirla, cambiar sus medidas o agregarle niveles.</p>
      ) : (
        <SeccionSeleccionada {...props} hojaId={hoja.id} raizId={raiz.id} />
      )}
    </div>
  );
}

function SeccionSeleccionada(props: DetalleGondolaPanelProps & { hojaId: number; raizId: number }) {
  const { gondola, estructura, puedeEscribir, niveles, posicionesPorNivelId } = props;
  const raiz = estructura!.raiz!;
  const hoja = estructura!.hojas.find((h) => h.id === props.hojaId)!;
  const rects = useMemo(() => rectangulosDeNodos(raiz, gondola.ancho_cm, gondola.alto_cm), [raiz, gondola.ancho_cm, gondola.alto_cm]);

  const nodoAncho = nodoQueControla(raiz, hoja.id, 'COLUMNAS');
  const nodoAlto = nodoQueControla(raiz, hoja.id, 'FILAS');
  const nivelesHoja = niveles.filter((n) => hoja.nivelIds.includes(n.id)).sort((a, b) => a.orden - b.orden);
  const totalProductos = nivelesHoja.reduce((s, n) => s + (posicionesPorNivelId[n.id] ?? 0), 0);
  const desdePiso = gondola.alto_cm - (hoja.yCm + hoja.altoCm);

  return (
    <>
      <div className="detalle-gondola-panel__titulo">
        <h3>Sección {hoja.indice}</h3>
        <span>
          {hoja.anchoCm} × {hoja.altoCm} cm · de {desdePiso} a {desdePiso + hoja.altoCm} cm del piso
        </span>
      </div>

      <div className="detalle-gondola-panel__medidas">
        <Medida
          etiqueta="Ancho"
          valor={nodoAncho ? rects.get(nodoAncho.id)!.ancho : hoja.anchoCm}
          editable={puedeEscribir && Boolean(nodoAncho)}
          nota={nodoAncho ? 'La diferencia la absorbe la sección vecina.' : 'Ocupa todo el ancho de la góndola.'}
          onAplicar={(v) => nodoAncho && props.onRedimensionar(nodoAncho.id, v)}
        />
        <Medida
          etiqueta="Alto"
          valor={nodoAlto ? rects.get(nodoAlto.id)!.alto : hoja.altoCm}
          editable={puedeEscribir && Boolean(nodoAlto)}
          nota={nodoAlto ? 'La diferencia la absorbe la sección vecina.' : 'Ocupa todo el alto de la góndola.'}
          onAplicar={(v) => nodoAlto && props.onRedimensionar(nodoAlto.id, v)}
        />
      </div>

      {puedeEscribir && (
        <div className="detalle-gondola-panel__acciones">
          <Button variante="outline" onClick={() => props.onDividir('COLUMNAS', hoja.id)}>Dividir en columnas</Button>
          <Button variante="outline" onClick={() => props.onDividir('FILAS', hoja.id)}>Dividir arriba / abajo</Button>
          <Button
            variante="peligro"
            disabled={totalProductos > 0}
            title={totalProductos > 0 ? 'Quita o mueve primero sus productos' : 'Su espacio pasa a la sección vecina'}
            onClick={() => props.onQuitarSeccion(hoja.id)}
          >
            Quitar sección
          </Button>
        </div>
      )}

      <div className="detalle-gondola-panel__niveles">
        <div className="detalle-gondola-panel__niveles-encabezado">
          <h4>Niveles ({nivelesHoja.length})</h4>
          {puedeEscribir && (
            <button type="button" className="detalle-gondola-panel__link" onClick={() => props.onAgregarNivel(hoja.id, hoja.anchoCm)}>
              + Agregar nivel
            </button>
          )}
        </div>
        {nivelesHoja.length === 0 ? (
          <p className="detalle-gondola-panel__texto">Sin niveles. Usa "+ Agregar nivel" o el "+" de la sección en la góndola.</p>
        ) : (
          <ul>
            {nivelesHoja.map((n, i) => (
              <li key={n.id}>
                <span className="detalle-gondola-panel__nivel-num">N{i + 1}</span>
                <span>{n.tipo_accesorio.toLowerCase()}</span>
                <span className="detalle-gondola-panel__ayuda">{n.altura_desde_piso_cm} cm del piso</span>
                <span className="detalle-gondola-panel__ayuda">{posicionesPorNivelId[n.id] ?? 0} posiciones</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function Medida({ etiqueta, valor, editable, nota, onAplicar }: { etiqueta: string; valor: number; editable: boolean; nota: string; onAplicar: (v: number) => void }) {
  const [borrador, setBorrador] = useState<string | null>(null);

  function confirmar() {
    if (borrador === null) return;
    const v = Number(borrador);
    setBorrador(null);
    if (Number.isFinite(v) && v > 0 && v !== valor) onAplicar(v);
  }

  return (
    <div className="detalle-gondola-panel__medida">
      <label>
        <span>{etiqueta}</span>
        {editable ? (
          <input
            type="number"
            inputMode="numeric"
            value={borrador ?? String(valor)}
            onChange={(e) => setBorrador(e.target.value)}
            onBlur={confirmar}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <strong>{valor}</strong>
        )}
        <span className="detalle-gondola-panel__ayuda">cm</span>
      </label>
      <span className="detalle-gondola-panel__ayuda">{nota}</span>
    </div>
  );
}

// ─── SKU en la versión ───────────────────────────────────────────────────────

function PestanaSkus(props: DetalleGondolaPanelProps) {
  const [soloEsta, setSoloEsta] = useState(true);
  if (!props.skus) return <p className="detalle-gondola-panel__texto">Cargando…</p>;

  const filas = props.skus.skus.filter((s) => !soloEsta || s.ubicaciones.some((u) => u.gondolaId === props.gondola.id));

  return (
    <div className="detalle-gondola-panel__bloque">
      <label className="detalle-gondola-panel__ganchos">
        <input type="checkbox" checked={soloEsta} onChange={() => setSoloEsta((v) => !v)} />
        Solo SKU de esta góndola
      </label>
      <p className="detalle-gondola-panel__texto">
        Facings y capacidad suman todas las ubicaciones del SKU en la versión. Mín./máx. se editan una vez y se aplican a todas
        sus ubicaciones.
      </p>
      <div className="detalle-gondola-panel__tabla">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th className="num">Facings</th>
              <th className="num">Capac.</th>
              <th>Mín.</th>
              <th>Máx.</th>
              <th>Ganchos</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((s) => (
              <FilaSku key={s.sku} sku={s} {...props} />
            ))}
          </tbody>
        </table>
        {filas.length === 0 && <p className="detalle-gondola-panel__texto">No hay productos todavía.</p>}
      </div>
    </div>
  );
}

function FilaSku({ sku, puedeEscribir, onEditarSku, onIrAPosicion }: DetalleGondolaPanelProps & { sku: SkuVersion }) {
  return (
    <>
      <tr>
        <td>
          <span className="detalle-gondola-panel__sku">{sku.sku}</span>
          <span className="detalle-gondola-panel__ayuda detalle-gondola-panel__nombre">{sku.nombre ?? ''}</span>
          <span className="detalle-gondola-panel__ubicaciones">
            {sku.ubicaciones.map((u) => (
              <button key={u.posicionId} type="button" onClick={() => onIrAPosicion(u.posicionId)} title="Ver en la góndola">
                {u.gondola}
                {u.seccion ? ` · S${u.seccion}` : ''} · N{u.nivel}
              </button>
            ))}
          </span>
        </td>
        <td className="num">{sku.facings}</td>
        <td className="num">{sku.capacidadTotal ?? '—'}</td>
        <td>
          <CampoMinMax valor={sku.minFinal} varia={sku.minVaria} editable={puedeEscribir} etiqueta={`Mínimo final de ${sku.sku}`} onAplicar={(v) => onEditarSku(sku.sku, { min_final: v })} />
        </td>
        <td>
          <CampoMinMax valor={sku.maxFinal} varia={sku.maxVaria} editable={puedeEscribir} etiqueta={`Máximo final de ${sku.sku}`} onAplicar={(v) => onEditarSku(sku.sku, { max_final: v })} />
        </td>
        <td className="detalle-gondola-panel__mono">{sku.ganchos.map(dos).join(' · ')}</td>
      </tr>
      {sku.alertas.length > 0 && (
        <tr className="detalle-gondola-panel__alerta">
          <td colSpan={6}>{sku.alertas.map((a) => a.mensaje).join(' · ')}</td>
        </tr>
      )}
    </>
  );
}

function CampoMinMax({ valor, varia, editable, etiqueta, onAplicar }: { valor: number | null; varia: boolean; editable: boolean; etiqueta: string; onAplicar: (v: number | null) => void }) {
  const [borrador, setBorrador] = useState<string | null>(null);
  const actual = valor === null ? '' : String(valor);

  function confirmar() {
    if (borrador === null) return;
    const texto = borrador.trim();
    setBorrador(null);
    if (texto === actual) return;
    if (texto === '') return onAplicar(null);
    const v = Number(texto);
    if (Number.isInteger(v) && v >= 0) onAplicar(v);
  }

  if (!editable) return <span>{varia ? 'varía' : (valor ?? '—')}</span>;
  return (
    <input
      type="number"
      inputMode="numeric"
      aria-label={etiqueta}
      placeholder={varia ? 'varía' : ''}
      value={borrador ?? actual}
      onChange={(e) => setBorrador(e.target.value)}
      onBlur={confirmar}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}
