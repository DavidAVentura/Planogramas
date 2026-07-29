import { Link } from 'react-router-dom';
import './Breadcrumb.css';

export interface BreadcrumbSegmento {
  label: string;
  to?: string;
}

export function Breadcrumb({ segmentos }: { segmentos: BreadcrumbSegmento[] }) {
  return (
    <nav className="breadcrumb" aria-label="breadcrumb">
      {segmentos.map((seg, i) => (
        <span key={i} className="breadcrumb__segmento">
          {seg.to ? <Link to={seg.to}>{seg.label}</Link> : <span>{seg.label}</span>}
          {i < segmentos.length - 1 && <span className="breadcrumb__separador">/</span>}
        </span>
      ))}
    </nav>
  );
}
