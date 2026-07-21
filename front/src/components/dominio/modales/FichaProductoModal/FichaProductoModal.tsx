import { useState, type ReactNode } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { useFichaTecnicaProducto, useProductoCatalogo, useStockProducto } from '../../../../hooks/useCatalogo';
import './FichaProductoModal.css';

interface FichaProductoModalProps {
  sku: string;
  onClose: () => void;
}

interface BloqueColapsableProps {
  titulo: string;
  children: ReactNode;
}

function BloqueColapsable({ titulo, children }: BloqueColapsableProps) {
  const [abierto, setAbierto] = useState(true);

  return (
    <div className="ficha-producto-modal__bloque">
      <button
        type="button"
        className="ficha-producto-modal__bloque-titulo"
        aria-expanded={abierto}
        onClick={() => setAbierto((valorAnterior) => !valorAnterior)}
      >
        <span
          className={`ficha-producto-modal__bloque-flecha${
            abierto ? ' ficha-producto-modal__bloque-flecha--abierto' : ''
          }`}
        />
        {titulo}
      </button>
      {abierto && <div className="ficha-producto-modal__bloque-contenido">{children}</div>}
    </div>
  );
}

export function FichaProductoModal({ sku, onClose }: FichaProductoModalProps) {
  const { producto, cargando, error } = useProductoCatalogo(sku);
  const { fichaTecnica, cargando: cargandoFicha, error: errorFicha } = useFichaTecnicaProducto(sku);
  const { inventario, cargando: cargandoStock, error: errorStock } = useStockProducto(sku);

  return (
    <Modal titulo="Ficha de producto" onClose={onClose} ancho="lg">
      <div className="ficha-producto-modal__bloques">
        <BloqueColapsable titulo="Información">
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
        </BloqueColapsable>

        <BloqueColapsable titulo="Ficha técnica">
          {cargandoFicha && <p className="ficha-producto-modal__vacio">Cargando ficha técnica…</p>}
          {!cargandoFicha && errorFicha && (
            <p className="ficha-producto-modal__vacio">
              No se pudo cargar la ficha técnica para <span className="ficha-producto-modal__sku">{sku}</span>.
            </p>
          )}
          {!cargandoFicha && !errorFicha && fichaTecnica.length === 0 && (
            <p className="ficha-producto-modal__vacio">Sin ficha técnica registrada para este SKU.</p>
          )}
          {!cargandoFicha && !errorFicha && fichaTecnica.length > 0 && (
            <dl className="ficha-producto-modal__ficha-tecnica">
              {fichaTecnica.map((campo) => (
                <div className="ficha-producto-modal__ficha-tecnica-fila" key={campo.etiqueta}>
                  <dt>{campo.etiqueta}</dt>
                  <dd>{campo.valor}</dd>
                </div>
              ))}
            </dl>
          )}
        </BloqueColapsable>

        <BloqueColapsable titulo="Inventarios">
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
        </BloqueColapsable>
      </div>
    </Modal>
  );
}
