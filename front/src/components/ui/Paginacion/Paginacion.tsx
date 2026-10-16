import type { ReactNode } from 'react';
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
  /** Tamaños de página elegibles; junto con `onPageSizeChange` agrega el selector "Filas por página". */
  pageSizes?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  /** Reemplaza el texto del rango (por defecto "1–50 de N"). */
  rango?: ReactNode;
}

/** Controles Anterior/Siguiente para listados paginados en el servidor. No se muestra si todo cabe en una página. */
export function Paginacion({
  page,
  pageSize,
  total,
  onChange,
  deshabilitado = false,
  pageSizes,
  onPageSizeChange,
  rango,
}: PaginacionProps) {
  const totalPaginas = Math.max(Math.ceil(total / pageSize), 1);
  const conTamanos = pageSizes !== undefined && onPageSizeChange !== undefined;
  // Con selector de tamaño se muestra siempre que haya datos, para poder volver a un tamaño menor.
  if (totalPaginas <= 1 && !(conTamanos && total > 0)) return null;

  const desde = (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);

  return (
    <nav className="paginacion" aria-label="Paginación">
      <span className="paginacion__rango">{rango ?? `${desde}–${hasta} de ${total}`}</span>
      <div className="paginacion__controles">
        {conTamanos && (
          <label className="paginacion__tamano">
            <span>Filas por página</span>
            <select value={pageSize} disabled={deshabilitado} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
              {pageSizes.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
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
