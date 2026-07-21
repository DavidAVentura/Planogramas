import { Modal } from '../../../ui/Modal/Modal';
import { useProductoCatalogo, useStockProducto } from '../../../../hooks/useCatalogo';
import './FichaProductoModal.css';

interface FichaProductoModalProps {
  sku: string;
  onClose: () => void;
}

export function FichaProductoModal({ sku, onClose }: FichaProductoModalProps) {
  const { producto, cargando, error } = useProductoCatalogo(sku);
  const { inventario, cargando: cargandoStock, error: errorStock } = useStockProducto(sku);

  return (
    <Modal titulo="Ficha de producto" onClose={onClose} ancho="sm">
      {cargando && <p className="ficha-producto-modal__vacio">Cargando…</p>}
      {!cargando && error && (
        <p className="ficha-producto-modal__vacio">
          No se pudo cargar el catálogo para <span className="ficha-producto-modal__sku">{sku}</span>.
        </p>
      )}
      {!cargando && !error && !producto && (
        <p className="ficha-producto-modal__vacio">
          El SKU <span className="ficha-producto-modal__sku">{sku}</span> no se encontró en el catálogo.
        </p>
      )}
      {!cargando && producto && (
        <div className="ficha-producto-modal__contenido">
          {producto.imagen_url ? (
            <img className="ficha-producto-modal__imagen" src={producto.imagen_url} alt={producto.nombre} />
          ) : (
            <div className="ficha-producto-modal__imagen ficha-producto-modal__imagen--vacia" />
          )}

          <div className="ficha-producto-modal__datos">
            <span className="ficha-producto-modal__nombre">{producto.nombre}</span>
            <span className="ficha-producto-modal__sku">{producto.sku}</span>
            {producto.marca && <span>Marca: {producto.marca}</span>}
            {(producto.categoria_nivel1 || producto.categoria_nivel2 || producto.subcategoria) && (
              <span>
                {[producto.categoria_nivel1, producto.categoria_nivel2, producto.subcategoria]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            )}
            {producto.ancho_cm != null && producto.alto_cm != null && producto.profundidad_cm != null && (
              <span>
                {producto.ancho_cm}×{producto.alto_cm}×{producto.profundidad_cm} cm
              </span>
            )}
            {producto.precio != null && <span>Q{producto.precio.toFixed(2)}</span>}
          </div>
        </div>
      )}

      <div className="ficha-producto-modal__inventarios">
        <span className="ficha-producto-modal__inventarios-titulo">Inventarios</span>
        {cargandoStock && <p className="ficha-producto-modal__vacio">Cargando inventario…</p>}
        {!cargandoStock && errorStock && (
          <p className="ficha-producto-modal__vacio">
            No se pudo cargar el inventario para <span className="ficha-producto-modal__sku">{sku}</span>.
          </p>
        )}
        {!cargandoStock && !errorStock && inventario.length === 0 && (
          <p className="ficha-producto-modal__vacio">Sin stock registrado en SAP para este SKU.</p>
        )}
        {!cargandoStock && !errorStock && inventario.length > 0 && (
          <table className="ficha-producto-modal__tabla-inventarios">
            <thead>
              <tr>
                <th>Centro</th>
                <th>Disponible</th>
                <th>Dañado</th>
                <th>Bloqueado</th>
                <th>Alterno</th>
              </tr>
            </thead>
            <tbody>
              {inventario.map((item, i) => (
                <tr key={`${item.centroId ?? item.centro ?? 'centro'}-${i}`}>
                  <td>{item.centro ?? item.centroId ?? '—'}</td>
                  <td>{item.stock ?? '—'}</td>
                  <td>{item.stockDaniado ?? '—'}</td>
                  <td>{item.stockBloqueado ?? '—'}</td>
                  <td>{item.stockAlterno ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Modal>
  );
}
