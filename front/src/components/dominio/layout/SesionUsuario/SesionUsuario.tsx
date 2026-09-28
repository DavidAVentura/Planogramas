import { useAuth } from '../../../../context/AuthContext';
import './SesionUsuario.css';

/** Usuario de la sesión CAO + salir. */
export function SesionUsuario() {
  const { usuario, cerrarSesion } = useAuth();
  if (!usuario) return null;

  const nombre = usuario.nombre ?? usuario.usuario ?? usuario.correo ?? 'Usuario';
  const detalle = usuario.numeroEmpleado ? `${nombre} · N.º ${usuario.numeroEmpleado}` : (usuario.correo ?? nombre);

  return (
    <div className="sesion-usuario">
      <span className="sesion-usuario__nombre" title={detalle}>
        {nombre}
      </span>
      <button type="button" className="sesion-usuario__salir" onClick={cerrarSesion}>
        Salir
      </button>
    </div>
  );
}
