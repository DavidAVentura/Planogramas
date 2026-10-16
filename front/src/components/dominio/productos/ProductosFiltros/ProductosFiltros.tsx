import { useState } from 'react';
import { Button } from '../../../ui/Button/Button';
import { BotonSeleccionMultiple } from '../../../ui/BotonSeleccionMultiple/BotonSeleccionMultiple';
import { SeleccionPlanogramasModal } from '../../modales/SeleccionPlanogramasModal/SeleccionPlanogramasModal';
import { CadenaJerarquia } from '../CadenaJerarquia/CadenaJerarquia';
import {
  FILTROS_PRODUCTOS_INICIALES,
  JERARQUIA_VACIA,
  MODO_APARICION_META,
  MODOS_APARICION,
} from '../../../../constants/productos';
import type { FiltroJerarquia, FiltrosListadoProductos } from '../../../../types/producto';
import './ProductosFiltros.css';

interface ProductosFiltrosProps {
  id: string;
  /**
   * La barra se oculta en vez de desmontarse: las opciones de cada nivel de jerarquía se cargan al
   * elegir el nivel de arriba y se perderían al volver a montarla.
   */
  visible: boolean;
  filtros: FiltrosListadoProductos;
  jerarquia: FiltroJerarquia;
  hayFiltrosActivos: boolean;
  onChange: (parciales: Partial<FiltrosListadoProductos>) => void;
  onJerarquiaChange: (jerarquia: FiltroJerarquia) => void;
  /** Productos de la lista actual por planograma; se muestra en el modal de planogramas. */
  productosPorPlanograma: Map<number, number>;
}

/** Barra desplegable de filtros del listado de productos; las etiquetas quedan solo para lectores de pantalla. */
export function ProductosFiltros({
  id,
  visible,
  filtros,
  jerarquia,
  hayFiltrosActivos,
  onChange,
  onJerarquiaChange,
  productosPorPlanograma,
}: ProductosFiltrosProps) {
  const [modalPlanogramas, setModalPlanogramas] = useState(false);
  // Al limpiar, un `key` nuevo reinicia las opciones cargadas de la cadena de jerarquía.
  const [claveCadena, setClaveCadena] = useState(0);

  function limpiar() {
    onChange(FILTROS_PRODUCTOS_INICIALES);
    onJerarquiaChange(JERARQUIA_VACIA);
    setClaveCadena((c) => c + 1);
  }

  return (
    <div id={id} className="productos-filtros" hidden={!visible}>
      <div className="productos-filtros__fila">
        <label className="productos-filtros__campo productos-filtros__campo--busqueda">
          <span className="productos-filtros__oculto">Buscar producto</span>
          <input
            type="search"
            placeholder="SKU, nombre o marca"
            value={filtros.busqueda}
            onChange={(e) => onChange({ busqueda: e.target.value })}
          />
        </label>

        <div className="productos-filtros__campo">
          <BotonSeleccionMultiple
            seleccionados={filtros.planogramas}
            textoVacio="Todos los planogramas"
            plural="planogramas"
            ariaLabel="Planograma"
            onClick={() => setModalPlanogramas(true)}
          />
        </div>

        <label className="productos-filtros__campo">
          <span className="productos-filtros__oculto">Aparece como</span>
          <select
            value={filtros.modo}
            onChange={(e) => onChange({ modo: e.target.value as FiltrosListadoProductos['modo'] })}
          >
            <option value="">Cualquier aparición</option>
            {MODOS_APARICION.map((modo) => (
              <option key={modo} value={modo}>
                {MODO_APARICION_META[modo].label}
              </option>
            ))}
            <option value="NINGUNO">Sin planograma</option>
          </select>
        </label>

        <label className="productos-filtros__campo">
          <span className="productos-filtros__oculto">Estado</span>
          <select value={filtros.estado} onChange={(e) => onChange({ estado: e.target.value })}>
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </label>

        {hayFiltrosActivos && (
          <Button variante="ghost" onClick={limpiar}>
            Limpiar filtros
          </Button>
        )}
      </div>

      {filtros.planogramas.length > 1 && (
        <div className="productos-filtros__chips" aria-label="Planogramas seleccionados">
          {filtros.planogramas.map((p) => (
            <span key={p.id} className="productos-filtros__chip">
              {p.nombre}
              <button
                type="button"
                aria-label={`Quitar ${p.nombre}`}
                onClick={() => onChange({ planogramas: filtros.planogramas.filter((s) => s.id !== p.id) })}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      <CadenaJerarquia key={claveCadena} jerarquia={jerarquia} onChange={onJerarquiaChange} />

      {modalPlanogramas && (
        <SeleccionPlanogramasModal
          seleccionados={filtros.planogramas}
          conteo={{ porId: productosPorPlanograma, singular: 'producto', plural: 'productos' }}
          onAplicar={(planogramas) => onChange({ planogramas })}
          onClose={() => setModalPlanogramas(false)}
        />
      )}
    </div>
  );
}
