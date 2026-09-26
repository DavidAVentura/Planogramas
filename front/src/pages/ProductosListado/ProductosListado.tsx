import { useMemo, useState } from 'react';
import { AppTopbar } from '../../components/dominio/layout/AppTopbar/AppTopbar';
import { ProductosFiltros } from '../../components/dominio/productos/ProductosFiltros/ProductosFiltros';
import { ProductosTable } from '../../components/dominio/productos/ProductosTable/ProductosTable';
import { FILTROS_PRODUCTOS_INICIALES, JERARQUIA_VACIA } from '../../constants/productos';
import { useProductos } from '../../hooks/useProductos';
import {
  ORDEN_INICIAL,
  alternarOrden,
  esOrdenInicial,
  ordenarProductos,
  type CampoOrdenProducto,
  type CriterioOrden,
} from '../../domain/productos/ordenProductos';
import type { FiltroJerarquia, FiltrosListadoProductos } from '../../types/producto';
import './ProductosListado.css';

const NOMBRE_CAMPO: Record<CampoOrdenProducto, string> = {
  sku: 'SKU',
  nombre: 'Producto',
  jerarquia: 'Jerarquía',
  planogramas: 'Planogramas',
  estado: 'Estado',
};

// La jerarquía se resuelve en el backend (contra CATI); búsqueda, modo, estado y orden se resuelven
// en el cliente sobre esa lista, igual que en Tiendas: la tabla local solo tiene los SKUs que ya se
// usaron en alguna posición, así que el volumen es acotado.
export function ProductosListado() {
  const [jerarquia, setJerarquia] = useState<FiltroJerarquia>(JERARQUIA_VACIA);
  const [filtros, setFiltros] = useState<FiltrosListadoProductos>(FILTROS_PRODUCTOS_INICIALES);
  const [orden, setOrden] = useState<CriterioOrden[]>(ORDEN_INICIAL);
  const { productos, cargando } = useProductos(jerarquia);

  const porSku = useMemo(() => new Map(productos.map((p) => [p.sku, p])), [productos]);

  const productosPorPlanograma = useMemo(() => {
    const conteo = new Map<number, number>();
    productos.forEach((p) => p.planograma_ids.forEach((id) => conteo.set(id, (conteo.get(id) ?? 0) + 1)));
    return conteo;
  }, [productos]);

  const visibles = useMemo(() => {
    const q = filtros.busqueda.trim().toLowerCase();
    const planogramasElegidos = new Set(filtros.planogramas.map((pl) => pl.id));
    const filtrados = productos.filter(
      (p) =>
        (!q ||
          p.sku.toLowerCase().includes(q) ||
          p.nombre.toLowerCase().includes(q) ||
          (p.marca ?? '').toLowerCase().includes(q)) &&
        (!filtros.estado || p.estado === filtros.estado) &&
        // Cualquier modo cuenta (planograma, cross o impulso): basta con que el SKU esté en uno elegido.
        (planogramasElegidos.size === 0 || p.planograma_ids.some((id) => planogramasElegidos.has(id))) &&
        (!filtros.modo ||
          (filtros.modo === 'NINGUNO' ? p.planogramas === 0 : p.apariciones[filtros.modo] > 0)),
    );
    return ordenarProductos(filtrados, orden);
  }, [productos, filtros, orden]);

  const sinPlanograma = visibles.filter((p) => p.planogramas === 0).length;
  const resumenOrden = orden.map((o) => `${NOMBRE_CAMPO[o.campo]} ${o.dir === 'asc' ? '↑' : '↓'}`).join('  ›  ');

  return (
    <div className="productos-listado">
      <AppTopbar titulo="Productos" />

      <div className="productos-listado__contenido">
        <div className="productos-listado__cabecera">
          <div className="productos-listado__resumen">
            <span className="productos-listado__conteo">
              {cargando ? 'Cargando…' : visibles.length === 1 ? '1 producto' : `${visibles.length} productos`}
            </span>
            {!cargando && (
              <span className="productos-listado__cobertura">
                {visibles.length - sinPlanograma} en planogramas · {sinPlanograma} sin planograma
              </span>
            )}
            <span className="productos-listado__orden">
              Ordenado por <strong>{resumenOrden}</strong>
            </span>
            {!esOrdenInicial(orden) && (
              <button type="button" className="productos-listado__restablecer" onClick={() => setOrden(ORDEN_INICIAL)}>
                Restablecer orden
              </button>
            )}
          </div>
          <span className="productos-listado__nota">Productos ya usados en planogramas · jerarquía según CATI</span>
        </div>

        <ProductosFiltros
          filtros={filtros}
          jerarquia={jerarquia}
          onChange={(parciales) => setFiltros((f) => ({ ...f, ...parciales }))}
          onJerarquiaChange={setJerarquia}
          productosPorPlanograma={productosPorPlanograma}
        />

        {/* Al cambiar la jerarquía se mantiene la tabla anterior mientras llega la nueva. */}
        {(!cargando || productos.length > 0) && (
          <div className={cargando ? 'productos-listado__tabla--cargando' : undefined} aria-busy={cargando}>
            <ProductosTable
              rows={visibles}
              orden={orden}
              onOrdenar={(campo) => setOrden((actual) => alternarOrden(actual, campo))}
              buscarPorSku={(sku) => porSku.get(sku) ?? null}
            />
          </div>
        )}
      </div>
    </div>
  );
}
