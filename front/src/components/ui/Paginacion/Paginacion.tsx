import { Button } from '../Button/Button';
import './Paginacion.css';

interface PaginacionProps {
  /** Página actual, empezando en 1 (misma convención que las respuestas `{ data, total, page, pageSize }`). */
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
  /** Deshabilita los botones mientras llega la página pedida, para no encadenar clics. */
  deshabilitado?: boolean;
}

/** Controles Anterior/Siguiente para listados paginados en el servidor. No se muestra si todo cabe en una página. */
export function Paginacion({ page, pageSize, total, onChange, deshabilitado = false }: PaginacionProps) {
  const totalPaginas = Math.max(Math.ceil(total / pageSize), 1);
  if (totalPaginas <= 1) return null;

  const desde = (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);

  return (
    <nav className="paginacion" aria-label="Paginación">
      <span className="paginacion__rango">
        {desde}–{hasta} de {total}
      </span>
      <div className="paginacion__controles">
        <Button variante="ghost" disabled={deshabilitado || page <= 1} onClick={() => onChange(page - 1)}>
          ‹ Anterior
        </Button>
        <span className="paginacion__pagina" aria-current="page">
          Página {page} de {totalPaginas}
        </span>
        <Button
          variante="ghost"
          disabled={deshabilitado || page >= totalPaginas}
          onClick={() => onChange(page + 1)}
        >
          Siguiente ›
        </Button>
      </div>
    </nav>
  );
}
