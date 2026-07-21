import './FacingTile.css';

interface FacingTileProps {
  sku: string;
  cantidadApilable: number;
}

export function FacingTile({ sku, cantidadApilable }: FacingTileProps) {
  return (
    <div className="facing-tile">
      <span className="facing-tile__sku">{sku}</span>
      {cantidadApilable > 1 && <span className="facing-tile__apilable">×{cantidadApilable}</span>}
    </div>
  );
}
