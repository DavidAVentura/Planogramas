import { useState, type ReactNode } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { useFichaTecnicaProducto, useProductoCatalogo, useStockProducto } from '../../../../hooks/useCatalogo';
import type { InventarioSap } from '../../../../types/catalogo';
import './FichaProductoModal.css';

interface FichaProductoModalProps {
  sku: string;
  /** Si viene, el bloque de inventario muestra solo el centro SAP de esa tienda (vista del Implementador). */
  tienda?: { codigo: string; nombre: string };
  onClose: () => void;
}

// Mismo criterio que el backend (normalizarCodigoCentro): sin espacios ni distinción de mayúsculas.
function normalizarCentro(codigo: string | null): string {
  return (codigo ?? '').replace(/\s+/g, '').toUpperCase();
}

function GaleriaProducto({ imagenes, nombre }: { imagenes: string[]; nombre: string }) {
  const [activa, setActiva] = useState(0);

  if (imagenes.length === 0) {
    return <div className="ficha-producto-modal__imagen ficha-producto-modal__imagen--vacia" />;
  }

  return (
    <div className="ficha-producto-modal__galeria">
      <img className="ficha-producto-modal__imagen" src={imagenes[activa]} alt={nombre} />
      {imagenes.length > 1 && (
        <div className="ficha-producto-modal__miniaturas">
          {imagenes.map((url, i) => (
            <button
              key={url}
              type="button"
              className={`ficha-producto-modal__miniatura${i === activa ? ' ficha-producto-modal__miniatura--activa' : ''}`}
              aria-label={`Ver foto ${i + 1} de ${imagenes.length}`}
              aria-pressed={i === activa}
              onClick={() => setActiva(i)}
            >
              <img src={url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TablaInventarios({ filas }: { filas: InventarioSap[] }) {
  return (
    <table className="ficha-producto-modal__tabla-inventarios">
      <thead>
        <tr>
          <th>Código</th>
          <th>Centro</th>
          <th>Disponible</th>
          <th>Dañado</th>
          <th>Bloqueado</th>
          <th>Alterno</th>
        </tr>
      </thead>
      <tbody>
        {filas.map((item, i) => (
          <tr key={`${item.centroId ?? item.centro ?? 'centro'}-${i}`}>
            <td>{item.centroId ?? '—'}</td>
            <td>{item.centro ?? '—'}</td>
            <td>{item.stock ?? '—'}</td>
            <td>{item.stockDaniado ?? '—'}</td>
            <td>{item.stockBloqueado ?? '—'}</td>
            <td>{item.stockAlterno ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface BloqueColapsableProps {
  titulo: string;
  children: ReactNode;
  abiertoInicial?: boolean;
}

function BloqueColapsable({ titulo, children, abiertoInicial = true }: BloqueColapsableProps) {
  const [abierto, setAbierto] = useState(abiertoInicial);

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

export function FichaProductoModal({ sku, tienda, onClose }: FichaProductoModalProps) {
  const { producto, cargando, error } = useProductoCatalogo(sku);
  const { fichaTecnica, cargando: cargandoFicha, error: errorFicha } = useFichaTecnicaProducto(sku);
  const { inventario, cargando: cargandoStock, error: errorStock } = useStockProducto(sku);

  const imagenes = producto?.imagenes?.length ? producto.imagenes : producto?.imagen_url ? [producto.imagen_url] : [];
  const atributos = producto?.atributos ?? [];
  const filasInventario = tienda
    ? inventario.filter((item) => normalizarCentro(item.centroId) === normalizarCentro(tienda.codigo))
    : inventario;

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
              <GaleriaProducto key={producto.sku} imagenes={imagenes} nombre={producto.nombre} />

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

        <BloqueColapsable titulo="Atributos" abiertoInicial={false}>
          {cargando && <p className="ficha-producto-modal__vacio">Cargando atributos…</p>}
          {!cargando && producto && atributos.length === 0 && (
            <p className="ficha-producto-modal__vacio">Sin atributos registrados en el catálogo para este SKU.</p>
          )}
          {!cargando && !producto && <p className="ficha-producto-modal__vacio">Atributos no disponibles.</p>}
          {!cargando && atributos.length > 0 && (
            <dl className="ficha-producto-modal__ficha-tecnica">
              {atributos.map((atributo, i) => (
                <div className="ficha-producto-modal__ficha-tecnica-fila" key={`${atributo.nombre}-${i}`}>
                  <dt>{atributo.nombre}</dt>
                  <dd>{atributo.valor}</dd>
                </div>
              ))}
            </dl>
          )}
        </BloqueColapsable>

        <BloqueColapsable titulo="Ficha técnica" abiertoInicial={false}>
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

        <BloqueColapsable titulo={tienda ? `Inventario en ${tienda.nombre}` : 'Inventarios'} abiertoInicial={Boolean(tienda)}>
          {cargandoStock && <p className="ficha-producto-modal__vacio">Cargando inventario…</p>}
          {!cargandoStock && errorStock && (
            <p className="ficha-producto-modal__vacio">
              No se pudo cargar el inventario para <span className="ficha-producto-modal__sku">{sku}</span>.
            </p>
          )}
          {!cargandoStock && !errorStock && filasInventario.length === 0 && (
            <p className="ficha-producto-modal__vacio">
              {tienda
                ? `Sin stock registrado en SAP para este SKU en ${tienda.nombre} (${tienda.codigo}).`
                : 'Sin stock registrado en SAP para este SKU.'}
            </p>
          )}
          {!cargandoStock && !errorStock && filasInventario.length > 0 && <TablaInventarios filas={filasInventario} />}
        </BloqueColapsable>
      </div>
    </Modal>
  );
}
