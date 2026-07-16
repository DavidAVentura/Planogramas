import { useAuth, type Rol } from '../../../../context/AuthContext';
import './RoleSwitch.css';

const OPCIONES: { rol: Rol; label: string }[] = [
  { rol: 'analista', label: 'Analista' },
  { rol: 'implementador', label: 'Implementador' },
];

export function RoleSwitch() {
  const { rol, setRol } = useAuth();

  return (
    <div className="role-switch" role="radiogroup" aria-label="Rol">
      {OPCIONES.map((opcion) => (
        <button
          key={opcion.rol}
          type="button"
          role="radio"
          aria-checked={rol === opcion.rol}
          className={`role-switch__opcion ${rol === opcion.rol ? 'role-switch__opcion--activa' : ''}`}
          onClick={() => setRol(opcion.rol)}
        >
          {opcion.label}
        </button>
      ))}
    </div>
  );
}
