import { CAO_PORTAL_URL } from '../../config/env';
import { PantallaAcceso } from '../Acceso/PantallaAcceso';

interface SesionRequeridaProps {
  motivo?: string;
}

/** Bloqueo de toda la app cuando no hay sesión CAO válida. */
export function SesionRequerida({ motivo }: SesionRequeridaProps) {
  return (
    <PantallaAcceso
      titulo="Acceso restringido"
      mensaje={`${motivo ? `${motivo} ` : ''}Ingresa a Planogramas desde CemacoAllInOne.`}
      accion={
        CAO_PORTAL_URL && (
          <a className="button button--primary" href={CAO_PORTAL_URL}>
            Ir a CemacoAllInOne
          </a>
        )
      }
    />
  );
}
