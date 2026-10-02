import './SubcategoriasCard.css';

/** "(01-0819-962-922243-23239) CABEZAS DE DUCHA" → nombre y clave por separado. */
function partir(texto: string): { nombre: string; clave: string } {
  const m = /^\(([^)]+)\)\s*(.*)$/.exec(texto);
  return m ? { clave: m[1], nombre: m[2] } : { clave: '', nombre: texto };
}

/** Chips de las subcategorías de referencia; el detalle los muestra al desplegar "Subcategorías". */
export function SubcategoriasCard({ id, subcategorias }: { id?: string; subcategorias: string[] }) {
  return (
    <div id={id} className="subcategorias-card" role="region" aria-label="Subcategorías de referencia">
      {subcategorias.map((s) => {
        const { nombre, clave } = partir(s);
        return (
          <span key={s} className="subcategorias-card__chip" title={s}>
            {nombre}
            {clave && <span className="subcategorias-card__clave">{clave}</span>}
          </span>
        );
      })}
    </div>
  );
}
