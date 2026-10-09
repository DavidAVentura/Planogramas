import './IdentidadPlanograma.css';

interface IdentidadPlanogramaProps {
  nombre: string;
  descripcion: string | null | undefined;
  /** `compacta` para celdas angostas (matriz, selectores): textos más chicos y descripción a 2 líneas. */
  variante?: 'normal' | 'compacta';
}

/**
 * Nombre del planograma (correlativo, ej. AUTOS 01) en pequeño arriba y la descripción, más
 * grande, debajo: es la descripción la que identifica qué contiene el planograma.
 */
export function IdentidadPlanograma({ nombre, descripcion, variante = 'normal' }: IdentidadPlanogramaProps) {
  return (
    <span className={`identidad-planograma identidad-planograma--${variante}`}>
      <span className="identidad-planograma__nombre">{nombre}</span>
      {descripcion ? (
        <span className="identidad-planograma__descripcion" title={descripcion}>
          {descripcion}
        </span>
      ) : (
        <span className="identidad-planograma__descripcion identidad-planograma__descripcion--vacia">Sin descripción</span>
      )}
    </span>
  );
}
