import { Fragment, useState, type ReactNode } from 'react';
import { Badge } from '../../../ui/Badge/Badge';
import { EmptyState } from '../../../ui/EmptyState/EmptyState';
import { ProductoApariciones } from '../ProductoApariciones/ProductoApariciones';
import { ESTADO_PRODUCTO_META, MODO_APARICION_META, MODOS_APARICION } from '../../../../constants/productos';
import type { CampoOrdenProducto, CriterioOrden } from '../../../../domain/productos/ordenProductos';
import type { ProductoListado } from '../../../../types/producto';
import { formatearPrecio } from '../../../../utils/formatters';
import './ProductosTable.css';

// La tabla local guarda área/departamento/subcategoría con su código de CATI al final
// ("FERRETERIA (01)"); en la tabla solo se muestra el nombre.
function sinCodigo(nivel: string | null): string | null {
  return nivel ? nivel.replace(/\s*\([^)]*\)\s*$/, '') : null;
}

function formatearDimensiones(p: ProductoListado): string {
  const medidas = [p.ancho_cm, p.alto_cm, p.profundidad_cm];
  if (medidas.every((m) => m === null)) return 'Sin dimensiones';
  return `${medidas.map((m) => m ?? '?').join(' × ')} cm`;
}

interface ColumnaOrdenable {
  campo: CampoOrdenProducto;
  header: string;
  alinear?: 'right';
  render: (p: ProductoListado) => ReactNode;
}

const COLUMNAS: ColumnaOrdenable[] = [
  { campo: 'sku', header: 'SKU', render: (p) => <span className="productos-table__sku">{p.sku}</span> },
  {
    campo: 'nombre',
    header: 'Producto',
    render: (p) => (
      <div className="productos-table__producto">
        <span className="productos-table__nombre" title={p.nombre}>
          {p.nombre}
        </span>
        <span className="productos-table__secundario">
          {p.marca ?? 'Sin marca'} · {formatearDimensiones(p)}
          {!p.dimensiones_validadas && (
            <span
              className="productos-table__sin-validar"
              title={`Dimensiones de ${p.fuente_dimensiones ?? 'origen desconocido'}, pendientes de validar`}
            >
              sin validar
            </span>
          )}
        </span>
      </div>
    ),
  },
  {
    campo: 'jerarquia',
    header: 'Jerarquía CATI',
    render: (p) => {
      const ruta = [sinCodigo(p.categoria_nivel1), sinCodigo(p.categoria_nivel2)].filter(Boolean).join(' › ');
      return (
        <div className="productos-table__jerarquia">
          {ruta && <span className="productos-table__secundario">{ruta}</span>}
          <span className="productos-table__subcategoria">{sinCodigo(p.subcategoria) ?? '—'}</span>
        </div>
      );
    },
  },
  {
    campo: 'precio',
    header: 'Precio',
    alinear: 'right',
    render: (p) => (
      <span className={`productos-table__precio${p.precio === null ? ' productos-table__precio--vacio' : ''}`}>
        {p.precio === null ? 'Sin precio' : formatearPrecio(p.precio)}
      </span>
    ),
  },
  {
    campo: 'planogramas',
    header: 'Planogramas',
    alinear: 'right',
    render: (p) => (
      <span className={`productos-table__conteo${p.planogramas === 0 ? ' productos-table__conteo--cero' : ''}`}>
        {p.planogramas}
      </span>
    ),
  },
];

function EstadoProducto({ estado }: { estado: string }) {
  const meta = ESTADO_PRODUCTO_META[estado] ?? { label: estado, bg: 'var(--ink-100)', color: 'var(--fg-2)' };
  return (
    <Badge bg={meta.bg} color={meta.color}>
      {meta.label}
    </Badge>
  );
}

function AparecenComo({ producto }: { producto: ProductoListado }) {
  if (producto.planogramas === 0) return <span className="productos-table__sin-planograma">Sin planograma</span>;
  return (
    <span className="productos-table__modos">
      {MODOS_APARICION.filter((modo) => producto.apariciones[modo] > 0).map((modo) => (
        <Badge key={modo} bg={MODO_APARICION_META[modo].bg} color={MODO_APARICION_META[modo].color}>
          {MODO_APARICION_META[modo].label} <span className="productos-table__modo-conteo">{producto.apariciones[modo]}</span>
        </Badge>
      ))}
    </span>
  );
}

interface ProductosTableProps {
  rows: ProductoListado[];
  orden: CriterioOrden[];
  onOrdenar: (campo: CampoOrdenProducto) => void;
  /** Para mostrar el nombre del sustituto recomendado de un producto inactivo. */
  buscarPorSku: (sku: string) => ProductoListado | null;
}

export function ProductosTable({ rows, orden, onOrdenar, buscarPorSku }: ProductosTableProps) {
  const [expandidos, setExpandidos] = useState<ReadonlySet<string>>(new Set());

  function alternar(sku: string) {
    setExpandidos((actuales) => {
      const siguientes = new Set(actuales);
      if (siguientes.has(sku)) siguientes.delete(sku);
      else siguientes.add(sku);
      return siguientes;
    });
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        titulo="No hay productos con esos filtros"
        hint="Ajusta la jerarquía, la búsqueda, los planogramas o el tipo de aparición."
      />
    );
  }

  const variosCriterios = orden.length > 1;
  // expandir + columnas ordenables + "Aparece como" + estado
  const totalColumnas = COLUMNAS.length + 3;

  function encabezadoOrdenable(campo: CampoOrdenProducto, header: string, alinear?: 'right') {
    const indice = orden.findIndex((o) => o.campo === campo);
    const criterio = indice >= 0 ? orden[indice] : null;
    const principal = indice === 0;
    const siguiente = principal && criterio?.dir === 'asc' ? 'mayor a menor' : 'menor a mayor';
    return (
      <th
        key={campo}
        aria-sort={principal ? (criterio?.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        className={alinear === 'right' ? 'table__celda--derecha' : undefined}
      >
        <button
          type="button"
          className={[
            'productos-table__orden',
            principal && 'productos-table__orden--principal',
            indice > 0 && 'productos-table__orden--secundario',
          ]
            .filter(Boolean)
            .join(' ')}
          title={`Ordenar por ${header.toLowerCase()} de ${siguiente}`}
          onClick={() => onOrdenar(campo)}
        >
          {header}
          <IconoOrden dir={criterio?.dir ?? null} />
          {variosCriterios && criterio && (
            <span className="productos-table__prioridad" aria-hidden="true">
              {indice + 1}
            </span>
          )}
        </button>
      </th>
    );
  }

  return (
    <table className="table productos-table">
      <thead>
        <tr>
          <th className="productos-table__col-expandir">
            <span className="productos-table__oculto">Detalle</span>
          </th>
          {COLUMNAS.map((col) => encabezadoOrdenable(col.campo, col.header, col.alinear))}
          <th>Aparece como</th>
          {encabezadoOrdenable('estado', 'Estado')}
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => {
          const abierto = expandidos.has(p.sku);
          const idDetalle = `producto-apariciones-${p.sku}`;
          return (
            <Fragment key={p.sku}>
              <tr
                className={[
                  p.estado !== 'activo' && 'productos-table__fila--inactiva',
                  abierto && 'productos-table__fila--abierta',
                ]
                  .filter(Boolean)
                  .join(' ') || undefined}
              >
                <td className="productos-table__col-expandir">
                  <button
                    type="button"
                    className="productos-table__expandir"
                    aria-expanded={abierto}
                    aria-controls={abierto ? idDetalle : undefined}
                    aria-label={`${abierto ? 'Ocultar' : 'Ver'} planogramas de ${p.nombre}`}
                    onClick={() => alternar(p.sku)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d={abierto ? 'M6 9l6 6 6-6' : 'M9 6l6 6-6 6'} />
                    </svg>
                  </button>
                </td>
                {COLUMNAS.map((col) => (
                  <td
                    key={col.campo}
                    data-label={col.header}
                    className={col.alinear === 'right' ? 'table__celda--derecha' : undefined}
                  >
                    {col.render(p)}
                  </td>
                ))}
                <td data-label="Aparece como">
                  <AparecenComo producto={p} />
                </td>
                <td data-label="Estado">
                  <EstadoProducto estado={p.estado} />
                </td>
              </tr>
              {abierto && (
                <tr className="productos-table__detalle">
                  <td id={idDetalle} colSpan={totalColumnas}>
                    <ProductoApariciones
                      producto={p}
                      sustituto={p.sku_sustituto ? buscarPorSku(p.sku_sustituto) : null}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

function IconoOrden({ dir }: { dir: 'asc' | 'desc' | null }) {
  const trazo = dir === 'asc' ? 'M12 19V5M6 11l6-6 6 6' : dir === 'desc' ? 'M12 5v14M6 13l6 6 6-6' : 'M8 9l4-4 4 4M8 15l4 4 4-4';
  return (
    <svg
      className={dir ? undefined : 'productos-table__icono--inactivo'}
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
