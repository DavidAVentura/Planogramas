import { Button } from '../../../ui/Button/Button';
import './BarraCambiosAsignacion.css';

interface BarraCambiosAsignacionProps {
  cambios: number;
  especialesNuevas: number;
  puedeDeshacer: boolean;
  onDeshacer: () => void;
  onDescartar: () => void;
  onGuardar: () => void;
}

export function BarraCambiosAsignacion({
  cambios,
  especialesNuevas,
  puedeDeshacer,
  onDeshacer,
  onDescartar,
  onGuardar,
}: BarraCambiosAsignacionProps) {
  const hayCambios = cambios > 0;

  return (
    <div className={`barra-cambios-asignacion${hayCambios ? ' barra-cambios-asignacion--pendiente' : ''}`}>
      <div className="barra-cambios-asignacion__estado" role="status">
        {hayCambios ? (
          <>
            <strong>{cambios === 1 ? '1 cambio sin guardar' : `${cambios} cambios sin guardar`}</strong>
            {especialesNuevas > 0 && (
              <span className="barra-cambios-asignacion__especiales">
                {especialesNuevas === 1 ? '1 versión especial se creará' : `${especialesNuevas} versiones especiales se crearán`} al guardar
              </span>
            )}
          </>
        ) : (
          <span className="barra-cambios-asignacion__guardado">Todo guardado</span>
        )}
        <span className="barra-cambios-asignacion__leyenda">
          <span className="barra-cambios-asignacion__punto" />
          cambio sin guardar
          <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 17h.01" />
          </svg>
          versión distinta al tipo de tienda
        </span>
      </div>
      <div className="barra-cambios-asignacion__acciones">
        {puedeDeshacer && (
          <button type="button" className="barra-cambios-asignacion__secundario barra-cambios-asignacion__secundario--borde" onClick={onDeshacer}>
            Deshacer
          </button>
        )}
        {hayCambios && (
          <>
            <button type="button" className="barra-cambios-asignacion__secundario" onClick={onDescartar}>
              Descartar
            </button>
            <Button className="barra-cambios-asignacion__guardar" onClick={onGuardar}>
              Guardar asignaciones
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
