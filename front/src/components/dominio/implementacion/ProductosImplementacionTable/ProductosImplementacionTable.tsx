import { useState, type DragEvent, type ReactNode } from 'react';
import { Badge } from '../../../ui/Badge/Badge';
import { MODO_APARICION_META } from '../../../../constants/productos';
import {
  DECISION_POSICION_META,
  ESTADO_INVENTARIO_META,
  PERFIL_REDONDEO_META,
} from '../../../../constants/implementacion';
import {
  columnaProducto,
  estadoInventario,
  textoAccesorios,
  type ClaveColumna,
  type CriterioOrdenProducto,
  type FiltrosColumna,
} from '../../../../domain/implementacion/columnasProductos';
import type { ProductoImplementacion } from '../../../../types/implementacion';
import type { ModoAparicion } from '../../../../types/producto';
import './ProductosImplementacionTable.css';

// ─── Celdas ──────────────────────────────────────────────────────────────────

const SIN_DATO = <span className="productos-impl__vacio">—</span>;

function numero(valor: number | null, extra?: string) {
  if (valor === null) return SIN_DATO;
  return <span className={`productos-impl__numero${extra ? ` ${extra}` : ''}`}>{valor.toLocaleString('es-GT')}</span>;
}

function conSecundario(principal: ReactNode, secundario: string | null, clasePrincipal?: string) {
  return (
    <span className="productos-impl__doble">
      <span className={clasePrincipal} title={typeof principal === 'string' ? principal : undefined}>
        {principal}
      </span>
      {secundario && (
        <span className="productos-impl__secundario" title={secundario}>
          {secundario}
        </span>
      )}
    </span>
  );
}

const CELDA: Record<ClaveColumna, (f: ProductoImplementacion) => ReactNode> = {
  sku: (f) => <span className="productos-impl__mono">{f.sku}</span>,
  producto: (f) => conSecundario(f.nombre ?? 'Sin nombre', f.marca, 'productos-impl__fuerte'),
  version: (f) => conSecundario(f.codigoVersion, f.planogramaNombre, 'productos-impl__mono'),
  gondola: (f) =>
    f.porUbicar ? conSecundario(f.gondola, 'Sin ubicar en el lienzo · guiarse por los ganchos', 'productos-impl__texto') : <span className="productos-impl__texto">{f.gondola}</span>,
  ganchos: (f) => (f.ganchos.length ? <span className="productos-impl__mono">{f.ganchos.join(', ')}</span> : SIN_DATO),
  accesorio: (f) =>
    f.accesorios.length
      ? conSecundario(textoAccesorios(f), f.accesorios.map((a) => a.nombre).join(', '), 'productos-impl__mono')
      : SIN_DATO,
  nivel: (f) => numero(f.nivel),
  orden: (f) => numero(f.orden),
  facings: (f) => numero(f.facings_horizontal),
  apilable: (f) => numero(f.cantidad_apilable),
  capacidadFacing: (f) => numero(f.unidades_por_facing),
  capacidadMaxima: (f) => numero(f.capacidad_maxima),
  minEstetico: (f) => numero(f.min_estetico),
  minFinal: (f) => numero(f.min_final),
  maxFinal: (f) => numero(f.max_final),
  perfil: (f) => {
    const meta = PERFIL_REDONDEO_META[f.perfil_redondeo];
    if (!meta) return f.perfil_redondeo;
    return (
      <span className="productos-impl__doble productos-impl__doble--badge" title={meta.ayuda}>
        <Badge bg={meta.bg} color={meta.color}>
          {meta.label}
        </Badge>
        <span className="productos-impl__secundario">{meta.ayuda}</span>
      </span>
    );
  },
  modo: (f) => {
    const meta = MODO_APARICION_META[f.modo as ModoAparicion];
    return meta ? (
      <Badge bg={meta.bg} color={meta.color}>
        {meta.label}
      </Badge>
    ) : (
      f.modo
    );
  },
  decision: (f) => {
    const meta = DECISION_POSICION_META[f.decision];
    return meta ? (
      <Badge bg={meta.bg} color={meta.color}>
        {meta.label}
      </Badge>
    ) : (
      f.decision
    );
  },
  observaciones: (f) =>
    f.observaciones ? <span className="productos-impl__observaciones">{f.observaciones}</span> : SIN_DATO,
  sustituto: (f) =>
    f.sku_sustituto ? conSecundario(f.sku_sustituto, f.sustituto_nombre, 'productos-impl__mono') : SIN_DATO,
  inventario: (f) =>
    numero(f.inventario, `productos-impl__fuerte${f.inventario === 0 ? ' productos-impl__numero--cero' : ''}`),
  estado: (f) => {
    const estado = estadoInventario(f);
    if (!estado) return SIN_DATO;
    const meta = ESTADO_INVENTARIO_META[estado];
    return (
      <Badge bg={meta.bg} color={meta.color}>
        {meta.label}
      </Badge>
    );
  },
};

// ─── Tabla ───────────────────────────────────────────────────────────────────

function IconoOrden({ dir }: { dir: 'asc' | 'desc' | null }) {
  const trazo = dir === 'asc' ? 'M12 19V5M6 11l6-6 6 6' : dir === 'desc' ? 'M12 5v14M6 13l6 6 6-6' : 'M8 9l4-4 4 4M8 15l4 4 4-4';
  return (
    <svg
      className={dir ? undefined : 'productos-impl__icono-inactivo'}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={trazo} />
    </svg>
  );
}

function IconoAsa() {
  return (
    <svg className="productos-impl__asa" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="6" r="1.8" />
      <circle cx="15" cy="6" r="1.8" />
      <circle cx="9" cy="12" r="1.8" />
      <circle cx="15" cy="12" r="1.8" />
      <circle cx="9" cy="18" r="1.8" />
      <circle cx="15" cy="18" r="1.8" />
    </svg>
  );
}

interface ProductosImplementacionTableProps {
  filas: ProductoImplementacion[];
  columnas: ClaveColumna[];
  orden: CriterioOrdenProducto[];
  filtros: FiltrosColumna;
  filtrosInvalidos: ReadonlySet<ClaveColumna>;
  onOrdenar: (clave: ClaveColumna) => void;
  onFiltrar: (clave: ClaveColumna, valor: string) => void;
  /** Soltar la columna `desde` sobre `hacia` al arrastrar un encabezado. */
  onMoverColumna: (desde: ClaveColumna, hacia: ClaveColumna) => void;
  /** Vista extendida: la tabla crece hasta llenar el alto de la página. */
  extendida?: boolean;
  /** Clic (o Enter) en una fila: abre la ficha del producto. */
  onAbrirProducto?: (fila: ProductoImplementacion) => void;
  vacio: ReactNode;
}

/**
 * Tabla configurable: orden anidado por clic en el encabezado, filtro bajo cada encabezado y
 * columnas que se reordenan arrastrando el encabezado. Encabezado fijo al hacer scroll; la última
 * columna se estira si sobra ancho.
 */
export function ProductosImplementacionTable({
  filas,
  columnas,
  orden,
  filtros,
  filtrosInvalidos,
  onOrdenar,
  onFiltrar,
  onMoverColumna,
  extendida = false,
  onAbrirProducto,
  vacio,
}: ProductosImplementacionTableProps) {
  const [arrastrando, setArrastrando] = useState<ClaveColumna | null>(null);
  const [sobre, setSobre] = useState<ClaveColumna | null>(null);

  const definiciones = columnas.map(columnaProducto);
  const anchoTotal = definiciones.reduce((suma, c) => suma + c.ancho, 0);
  const variosCriterios = orden.length > 1;

  function terminarArrastre() {
    setArrastrando(null);
    setSobre(null);
  }

  function alIniciar(e: DragEvent, clave: ClaveColumna) {
    e.dataTransfer.setData('text/plain', clave);
    e.dataTransfer.effectAllowed = 'move';
    setArrastrando(clave);
  }

  function alPasar(e: DragEvent, clave: ClaveColumna) {
    if (!arrastrando) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (sobre !== clave) setSobre(clave);
  }

  function alSoltar(e: DragEvent, clave: ClaveColumna) {
    e.preventDefault();
    if (arrastrando && arrastrando !== clave) onMoverColumna(arrastrando, clave);
    terminarArrastre();
  }

  return (
    <div className={`productos-impl__scroll${extendida ? ' productos-impl__scroll--extendida' : ''}`}>
      <table
        className="productos-impl"
        aria-label="Productos de la tienda"
        aria-rowcount={filas.length + 1}
        style={{ width: `max(${anchoTotal}px, 100%)` }}
      >
        <colgroup>
          {definiciones.map((c, i) => (
            // Sin ancho fijo en la última: toma el espacio que sobre (nunca menos que su ancho,
            // porque la tabla mide al menos la suma de todos).
            <col key={c.clave} style={i === definiciones.length - 1 ? undefined : { width: c.ancho }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {definiciones.map((col) => {
              const indice = orden.findIndex((o) => o.campo === col.clave);
              const criterio = indice >= 0 ? orden[indice] : null;
              const principal = indice === 0;
              const siguiente = principal && criterio?.dir === 'asc' ? 'mayor a menor' : 'menor a mayor';
              const valor = filtros[col.clave] ?? '';
              const invalido = filtrosInvalidos.has(col.clave);
              const esDestino = arrastrando !== null && arrastrando !== col.clave && sobre === col.clave;
              const nombreFiltro = `Filtrar por ${col.etiqueta.toLowerCase()}${
                col.filtro === 'numero' ? ' (número, >2, <=5 o rango 1-4)' : ''
              }`;
              return (
                <th
                  key={col.clave}
                  aria-sort={principal ? (criterio?.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={[
                    'productos-impl__encabezado',
                    esDestino && 'productos-impl__encabezado--destino',
                    arrastrando === col.clave && 'productos-impl__encabezado--arrastrando',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onDragOver={(e) => alPasar(e, col.clave)}
                  onDrop={(e) => alSoltar(e, col.clave)}
                >
                  <div
                    className="productos-impl__arrastre"
                    draggable
                    onDragStart={(e) => alIniciar(e, col.clave)}
                    onDragEnd={terminarArrastre}
                    title="Arrastra para mover la columna"
                  >
                    <IconoAsa />
                    <button
                      type="button"
                      className={[
                        'productos-impl__orden',
                        principal && 'productos-impl__orden--principal',
                        indice > 0 && 'productos-impl__orden--secundario',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      title={`Ordenar por ${col.etiqueta.toLowerCase()} de ${siguiente}`}
                      onClick={() => onOrdenar(col.clave)}
                    >
                      <span>{col.etiqueta.toUpperCase()}</span>
                      <IconoOrden dir={criterio?.dir ?? null} />
                      {variosCriterios && criterio && (
                        <span className="productos-impl__prioridad" aria-hidden="true">
                          {indice + 1}
                        </span>
                      )}
                    </button>
                  </div>
                  {col.filtro === 'enum' ? (
                    <select
                      className={`productos-impl__filtro${valor ? ' productos-impl__filtro--activo' : ''}`}
                      aria-label={nombreFiltro}
                      value={valor}
                      onChange={(e) => onFiltrar(col.clave, e.target.value)}
                    >
                      <option value="">Todos</option>
                      {col.opciones.map((o) => (
                        <option key={o.valor} value={o.valor}>
                          {o.etiqueta}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      inputMode={col.filtro === 'numero' ? 'decimal' : undefined}
                      className={[
                        'productos-impl__filtro',
                        valor && 'productos-impl__filtro--activo',
                        invalido && 'productos-impl__filtro--invalido',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-label={nombreFiltro}
                      aria-invalid={invalido || undefined}
                      placeholder={col.filtro === 'numero' ? '>2, 1-4' : 'Filtrar'}
                      value={valor}
                      onChange={(e) => onFiltrar(col.clave, e.target.value)}
                    />
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr
              key={f.posicionId}
              className={[
                f.decision === 'INACTIVO' && 'productos-impl__fila--inactiva',
                onAbrirProducto && 'productos-impl__fila--abrible',
              ]
                .filter(Boolean)
                .join(' ') || undefined}
              tabIndex={onAbrirProducto ? 0 : undefined}
              title={onAbrirProducto ? 'Ver ficha del producto' : undefined}
              onClick={() => {
                // Seleccionar texto de la fila (ej. copiar un SKU) no abre la ficha.
                if (!onAbrirProducto || window.getSelection()?.toString()) return;
                onAbrirProducto(f);
              }}
              onKeyDown={(e) => {
                if (onAbrirProducto && e.key === 'Enter') onAbrirProducto(f);
              }}
            >
              {definiciones.map((col) => (
                <td
                  key={col.clave}
                  className={col.filtro === 'numero' ? 'productos-impl__celda--numero' : undefined}
                >
                  {CELDA[col.clave](f)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {filas.length === 0 && <div className="productos-impl__sin-filas">{vacio}</div>}
    </div>
  );
}
