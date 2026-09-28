import './FacingTile.css';

interface FacingTileProps {
  /** Null en una posición sin SKU confirmado. */
  sku: string | null;
  nombre: string | null;
  imagenUrl: string | null;
  cantidadApilable: number;
}

export function FacingTile({ sku, nombre, imagenUrl, cantidadApilable }: FacingTileProps) {
  return (
    <div className="facing-tile">
      {imagenUrl ? (
        <img className="facing-tile__imagen" src={imagenUrl} alt={nombre ?? sku ?? 'Producto sin SKU'} />
      ) : (
        <div className="facing-tile__imagen facing-tile__imagen--vacia">
          <span className="facing-tile__sku">{sku ?? 'Sin SKU'}</span>
        </div>
      )}
      {cantidadApilable > 1 && <span className="facing-tile__apilable">×{cantidadApilable}</span>}
    </div>
  );
}
