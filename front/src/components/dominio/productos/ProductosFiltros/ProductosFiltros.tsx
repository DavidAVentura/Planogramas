import { Button } from '../../../ui/Button/Button';
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

const NIVELES: { campo: keyof FiltroJerarquia; etiqueta: string; todos: string }[] = [
  { campo: 'area', etiqueta: 'Área', todos: 'Todas' },
  { campo: 'departamento', etiqueta: 'Departamento', todos: 'Todos' },
  { campo: 'familia', etiqueta: 'Familia', todos: 'Todas' },
  { campo: 'categoria', etiqueta: 'Categoría', todos: 'Todas' },
  { campo: 'subcategoria', etiqueta: 'Subcategoría', todos: 'Todas' },
];

interface ProductosFiltrosProps {
  filtros: FiltrosListadoProductos;
  jerarquia: FiltroJerarquia;
  onChange: (parciales: Partial<FiltrosListadoProductos>) => void;
  onJerarquiaChange: (jerarquia: FiltroJerarquia) => void;
}

export function ProductosFiltros({ filtros, jerarquia, onChange, onJerarquiaChange }: ProductosFiltrosProps) {
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
    NIVELES.forEach(({ campo }, i) => {
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

  const hayFiltrosActivos =
    filtros.busqueda !== FILTROS_PRODUCTOS_INICIALES.busqueda ||
    filtros.modo !== FILTROS_PRODUCTOS_INICIALES.modo ||
    filtros.estado !== FILTROS_PRODUCTOS_INICIALES.estado ||
    NIVELES.some(({ campo }) => jerarquia[campo] !== '');

  return (
    <div className="productos-filtros">
      <div className="productos-filtros__fila">
        <label className="productos-filtros__campo productos-filtros__campo--busqueda">
          <span>Buscar</span>
          <input
            type="search"
            placeholder="SKU, nombre o marca"
            value={filtros.busqueda}
            onChange={(e) => onChange({ busqueda: e.target.value })}
          />
        </label>

        <label className="productos-filtros__campo">
          <span>Aparece como</span>
          <select
            value={filtros.modo}
            onChange={(e) => onChange({ modo: e.target.value as FiltrosListadoProductos['modo'] })}
          >
            <option value="">Cualquiera</option>
            {MODOS_APARICION.map((modo) => (
              <option key={modo} value={modo}>
                {MODO_APARICION_META[modo].label}
              </option>
            ))}
            <option value="NINGUNO">Sin planograma</option>
          </select>
        </label>

        <label className="productos-filtros__campo">
          <span>Estado</span>
          <select value={filtros.estado} onChange={(e) => onChange({ estado: e.target.value })}>
            <option value="">Todos</option>
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

      <div className="productos-filtros__jerarquia">
        {NIVELES.map((nivel, i) => {
          const padreSinElegir = i > 0 && !jerarquia[NIVELES[i - 1].campo];
          const cargando = cargandoPorNivel[i];
          return (
            <label
              key={nivel.campo}
              className={`productos-filtros__campo${jerarquia[nivel.campo] ? ' productos-filtros__campo--activo' : ''}`}
            >
              <span>
                <span className="productos-filtros__paso">{i + 1}</span>
                {nivel.etiqueta}
              </span>
              <select
                value={jerarquia[nivel.campo]}
                disabled={padreSinElegir || cargando}
                onChange={(e) => elegirNivel(i, e.target.value)}
              >
                <option value="">{cargando ? 'Cargando…' : nivel.todos}</option>
                {opcionesPorNivel[i].map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    </div>
  );
}
