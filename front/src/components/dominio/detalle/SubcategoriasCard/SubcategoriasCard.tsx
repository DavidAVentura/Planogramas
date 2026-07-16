import './SubcategoriasCard.css';

export function SubcategoriasCard({ subcategorias }: { subcategorias: string[] }) {
  return (
    <div className="subcategorias-card">
      <h3>Subcategorías de referencia</h3>
      <div className="subcategorias-card__chips">
        {subcategorias.map((s) => (
          <span key={s} className="subcategorias-card__chip">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
