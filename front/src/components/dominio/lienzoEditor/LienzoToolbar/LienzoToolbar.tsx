import './LienzoToolbar.css';

interface LienzoToolbarProps {
  catalogoVisible: boolean;
  onToggleCatalogo: () => void;
  onAgregarGondola: () => void;
  onExportar: () => void;
  /** Control de zoom vertical — solo se pasa en la vista extendida, donde la barra superior (con su zoom) está oculta. */
  zoom?: {
    porcentaje: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onZoomCambiar: (porcentaje: number) => void;
  };
}

/** Franja vertical de acciones del lienzo — mismo espíritu que la barra de herramientas de las apps de canvas (n8n incluido), reducida a lo que este módulo realmente necesita. */
export function LienzoToolbar({ catalogoVisible, onToggleCatalogo, onAgregarGondola, onExportar, zoom }: LienzoToolbarProps) {
  return (
    <aside className="lienzo-toolbar">
      <button
        type="button"
        className={`lienzo-toolbar__boton${catalogoVisible ? ' lienzo-toolbar__boton--activo' : ''}`}
        title="Catálogo de productos"
        onClick={onToggleCatalogo}
      >
        ▤
      </button>
      <button type="button" className="lienzo-toolbar__boton" title="Agregar góndola" onClick={onAgregarGondola}>
        ＋
      </button>
      <div className="lienzo-toolbar__separador" />
      {zoom && (
        <div className="lienzo-toolbar__zoom">
          <button type="button" className="lienzo-toolbar__zoom-paso" title="Acercar" onClick={zoom.onZoomIn}>
            +
          </button>
          <input
            type="range"
            min={5}
            max={200}
            value={zoom.porcentaje}
            aria-label="Zoom"
            onChange={(e) => zoom.onZoomCambiar(Number(e.target.value))}
          />
          <button type="button" className="lienzo-toolbar__zoom-paso" title="Alejar" onClick={zoom.onZoomOut}>
            −
          </button>
          <span>{zoom.porcentaje}%</span>
        </div>
      )}
      <button type="button" className="lienzo-toolbar__boton" title="Exportar lienzo (JSON)" onClick={onExportar}>
        ⇩
      </button>
    </aside>
  );
}
