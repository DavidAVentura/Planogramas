import { CAO_PORTAL_URL } from '../../config/env';
import { useAuth } from '../../context/AuthContext';
import { sesionService } from '../../services/sesion.service';
import { Button } from '../../components/ui/Button/Button';
import { PantallaAcceso } from '../Acceso/PantallaAcceso';

/** Usuario autenticado en CAO pero sin ningún permiso del módulo PLANOGRAMA. */
export function SinAcceso() {
  const { cerrarSesion } = useAuth();

  return (
    <PantallaAcceso
      titulo="Sin acceso a Planogramas"
      mensaje="Tu usuario no tiene permisos para este módulo. Solicita el acceso a Mesa de Ayuda con la aprobación de tu jefe inmediato y luego ingresa nuevamente desde NOVA."
      accion={
        CAO_PORTAL_URL ? (
          <a
            className="button button--primary"
            href={CAO_PORTAL_URL}
            onClick={() => sesionService.limpiar()}
            autoFocus
          >
            Ir a NOVA
          </a>
        ) : (
          <Button variante="outline" onClick={cerrarSesion} autoFocus>
            Salir
          </Button>
        )
      }
    />
  );
}
