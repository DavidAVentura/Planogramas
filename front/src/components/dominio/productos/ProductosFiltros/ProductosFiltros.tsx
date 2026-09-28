import { useState } from 'react';
import { Button } from '../../../ui/Button/Button';
import { BotonSeleccionMultiple } from '../../../ui/BotonSeleccionMultiple/BotonSeleccionMultiple';
import { SeleccionPlanogramasModal } from '../../modales/SeleccionPlanogramasModal/SeleccionPlanogramasModal';
import { useJerarquia, useJerarquiaExploracion } from '../../../../hooks/useJerarquia';
import {
  FILTROS_PRODUCTOS_INICIALES,
  JERARQUIA_VACIA,
  MODO_APARICION_META,
  MODOS_APARICION,
} from '../../../../constants/productos';
import type { JerarquiaItem } from '../../../../types/jerarquia';
import type { FiltroJerarquia, FiltrosListadoProductos } from '../../../../types/producto';
import './ProductosFiltros.css';

export const NIVELES_JERARQUIA: { campo: keyof FiltroJerarquia; etiqueta: string; todos: string }[] = [
  { campo: 'area', etiqueta: 'Área', todos: 'Todas las áreas' },
  { campo: 'departamento', etiqueta: 'Departamento', todos: 'Todos los departamentos' },
  { campo: 'familia', etiqueta: 'Familia', todos: 'Todas las familias' },
  { campo: 'categoria', etiqueta: 'Categoría', todos: 'Todas las categorías' },
  { campo: 'subcategoria', etiqueta: 'Subcategoría', todos: 'Todas las subcategorías' },
];

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
  const { areas, departamentos, cargandoDepartamentos, cargarDepartamentos } = useJerarquia();
  const exploracion = useJerarquiaExploracion();

  const opcionesPorNivel: JerarquiaItem[][] = [
    areas,
    departamentos,
    exploracion.familias,
    exploracion.categorias,
    exploracion.subcategorias,
  ];
  const cargandoPorNivel = [
    false,
    cargandoDepartamentos,
    exploracion.cargandoFamilias,
    exploracion.cargandoCategorias,
    exploracion.cargandoSubcategorias,
  ];
  // cargadores[i] carga las opciones del nivel i + 1 a partir del id elegido en el nivel i.
  const cargadores = [
    cargarDepartamentos,
    exploracion.cargarFamilias,
    exploracion.cargarCategorias,
    exploracion.cargarSubcategorias,
  ];

  // Elegir un nivel limpia los de abajo, que podrían no pertenecer al nuevo padre.
  function elegirNivel(indice: number, id: string) {
    const nueva = { ...jerarquia };
    NIVELES_JERARQUIA.forEach(({ campo }, i) => {
      if (i === indice) nueva[campo] = id;
      if (i > indice) nueva[campo] = '';
    });
    onJerarquiaChange(nueva);
    cargadores.forEach((cargar, i) => {
      if (i === indice) cargar(id);
      else if (i > indice) cargar('');
    });
  }

  function limpiar() {
    onChange(FILTROS_PRODUCTOS_INICIALES);
    onJerarquiaChange(JERARQUIA_VACIA);
    cargadores.forEach((cargar) => cargar(''));
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

      {/* Cadena Área › Departamento › … : cada nivel se habilita al elegir el de arriba. */}
      <div className="productos-filtros__jerarquia" role="group" aria-label="Jerarquía CATI">
        <span className="productos-filtros__titulo-jerarquia" aria-hidden="true">
          Jerarquía
        </span>
        {NIVELES_JERARQUIA.map((nivel, i) => {
          const padreSinElegir = i > 0 && !jerarquia[NIVELES_JERARQUIA[i - 1].campo];
          const cargando = cargandoPorNivel[i];
          return (
            <span key={nivel.campo} className="productos-filtros__nivel">
              {i > 0 && (
                <svg
                  className="productos-filtros__separador"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              )}
              <label
                className={`productos-filtros__campo${jerarquia[nivel.campo] ? ' productos-filtros__campo--activo' : ''}`}
              >
                <span className="productos-filtros__oculto">{nivel.etiqueta}</span>
                <select
                  value={jerarquia[nivel.campo]}
                  disabled={padreSinElegir || cargando}
                  onChange={(e) => elegirNivel(i, e.target.value)}
                >
                  <option value="">{cargando ? 'Cargando…' : padreSinElegir ? nivel.etiqueta : nivel.todos}</option>
                  {opcionesPorNivel[i].map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </span>
          );
        })}
      </div>

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
