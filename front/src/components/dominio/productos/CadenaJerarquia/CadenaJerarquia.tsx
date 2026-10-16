import { useJerarquia, useJerarquiaExploracion } from '../../../../hooks/useJerarquia';
import type { JerarquiaItem } from '../../../../types/jerarquia';
import type { FiltroJerarquia } from '../../../../types/producto';
import './CadenaJerarquia.css';

export const NIVELES_JERARQUIA: { campo: keyof FiltroJerarquia; etiqueta: string; todos: string }[] = [
  { campo: 'area', etiqueta: 'Área', todos: 'Todas las áreas' },
  { campo: 'departamento', etiqueta: 'Departamento', todos: 'Todos los departamentos' },
  { campo: 'familia', etiqueta: 'Familia', todos: 'Todas las familias' },
  { campo: 'categoria', etiqueta: 'Categoría', todos: 'Todas las categorías' },
  { campo: 'subcategoria', etiqueta: 'Subcategoría', todos: 'Todas las subcategorías' },
];

interface CadenaJerarquiaProps {
  jerarquia: FiltroJerarquia;
  /** Segundo argumento: nombres de los niveles elegidos, de Área hacia abajo (para chips y resúmenes). */
  onChange: (jerarquia: FiltroJerarquia, nombres: string[]) => void;
  deshabilitado?: boolean;
}

/**
 * Cadena Área › Departamento › Familia › Categoría › Subcategoría de CATI: cada nivel se habilita
 * al elegir el de arriba. Las opciones de cada nivel se cargan al elegir el anterior y viven en el
 * estado del componente: para reiniciarlas (ej. "Limpiar filtros") el padre cambia su `key`.
 */
export function CadenaJerarquia({ jerarquia, onChange, deshabilitado = false }: CadenaJerarquiaProps) {
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
    const nombres = NIVELES_JERARQUIA.flatMap(({ campo }, i) => {
      const elegido = nueva[campo];
      return elegido ? [opcionesPorNivel[i].find((item) => item.id === elegido)?.name ?? elegido] : [];
    });
    onChange(nueva, nombres);
    cargadores.forEach((cargar, i) => {
      if (i === indice) cargar(id);
      else if (i > indice) cargar('');
    });
  }

  return (
    <div className="cadena-jerarquia" role="group" aria-label="Jerarquía CATI">
      <span className="cadena-jerarquia__titulo" aria-hidden="true">
        Jerarquía
      </span>
      {NIVELES_JERARQUIA.map((nivel, i) => {
        const padreSinElegir = i > 0 && !jerarquia[NIVELES_JERARQUIA[i - 1].campo];
        const cargando = cargandoPorNivel[i];
        return (
          <span key={nivel.campo} className="cadena-jerarquia__nivel">
            {i > 0 && (
              <svg
                className="cadena-jerarquia__separador"
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
            <label className={`cadena-jerarquia__campo${jerarquia[nivel.campo] ? ' cadena-jerarquia__campo--activo' : ''}`}>
              <span className="cadena-jerarquia__oculto">{nivel.etiqueta}</span>
              <select
                value={jerarquia[nivel.campo]}
                disabled={deshabilitado || padreSinElegir || cargando}
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
  );
}
