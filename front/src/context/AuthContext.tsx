import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService } from '../services/auth.service';
import { sesionService } from '../services/sesion.service';
import type { UsuarioSesion } from '../types/usuario';
import {
  modoInicial,
  modosDisponibles,
  resolverModo,
  tienePermiso,
  type CodigoPermiso,
  type Modo,
} from '../domain/permisos/permisos';

// Modo elegido en esta pestaña (preferencia, no estado crítico: el back autoriza por permisos).
const CLAVE_MODO = 'planogramas.modo';

function leerModoGuardado(): string | null {
  try {
    return sessionStorage.getItem(CLAVE_MODO);
  } catch {
    return null;
  }
}

function escribirModoGuardado(modo: Modo | null): void {
  try {
    if (modo) sessionStorage.setItem(CLAVE_MODO, modo);
    else sessionStorage.removeItem(CLAVE_MODO);
  } catch {
    // Sin sessionStorage la preferencia solo dura mientras no se recargue.
  }
}

// Cada cuánto se envía el latido de sesión mientras la app está abierta. Debe ser menor que la
// ventana de inactividad de CAO y mayor que el límite de un keepalive por minuto del backend.
const INTERVALO_LATIDO_MS = 4 * 60 * 1000;

export type Rol = Modo;

export type EstadoSesion = 'verificando' | 'autenticado' | 'no_autenticado';

interface AuthContextValue {
  estado: EstadoSesion;
  usuario: UsuarioSesion | null;
  /** Guarda el token recibido en /auth?token= y lo valida contra el backend. */
  iniciarSesion: (token: string) => Promise<void>;
  cerrarSesion: () => void;
  /** Modo activo; `null` mientras no hay usuario o si el usuario no tiene ningún modo. */
  rol: Rol | null;
  /** Modos a los que el usuario tiene acceso según sus permisos. */
  modos: Rol[];
  setRol: (rol: Rol) => void;
  /** El usuario tiene el permiso CAO indicado (ej. PERMISOS.CREAR_TIENDA). */
  puede: (codigo: CodigoPermiso) => boolean;
  /** Capacidad de analista que calcula el back (regla A). */
  esAnalista: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Al cargar manda la ruta actual (recargar /mi-tienda conserva el modo); si no, el modo guardado.
  const [rolElegido, setRolElegido] = useState<Rol | null>(() =>
    modoInicial(window.location.pathname, leerModoGuardado()),
  );
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [estado, setEstado] = useState<EstadoSesion>(() =>
    sesionService.obtenerToken() ? 'verificando' : 'no_autenticado',
  );

  // El interceptor invalida la sesión ante cualquier 401 del backend.
  useEffect(
    () =>
      sesionService.alInvalidar(() => {
        escribirModoGuardado(null);
        setUsuario(null);
        setEstado('no_autenticado');
      }),
    [],
  );

  // Al cargar la app con un token ya guardado, se revalida para recuperar el usuario.
  useEffect(() => {
    if (estado !== 'verificando' || window.location.pathname === '/auth') return;
    authService
      .obtenerSesion()
      .then((datos) => {
        setUsuario(datos);
        setEstado('autenticado');
      })
      .catch(() => setEstado((actual) => (actual === 'verificando' ? 'no_autenticado' : actual)));
    // Solo en el montaje: después el estado cambia por iniciarSesion/invalidación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mientras haya sesión y la app esté abierta, un latido periódico mantiene viva la sesión CAO.
  // Al cerrar la pestaña o dar "Salir" el latido se detiene y el token se deja vencer en CAO.
  useEffect(() => {
    if (estado !== 'autenticado') return;

    let ultimoLatido = Date.now();
    const latir = () => {
      ultimoLatido = Date.now();
      // Un 401 lo maneja el interceptor (invalida la sesión); un fallo de red se reintenta en el
      // siguiente latido.
      authService.mantenerSesion().catch(() => undefined);
    };

    const intervalo = window.setInterval(latir, INTERVALO_LATIDO_MS);
    // Al volver a la pestaña (o despertar el equipo) los timers pudieron haberse frenado.
    const alVolverVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - ultimoLatido >= INTERVALO_LATIDO_MS) {
        latir();
      }
    };
    document.addEventListener('visibilitychange', alVolverVisible);

    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolverVisible);
    };
  }, [estado]);

  const iniciarSesion = useCallback(async (token: string) => {
    sesionService.guardarToken(token);
    setEstado('verificando');
    try {
      setUsuario(await authService.obtenerSesion());
      setEstado('autenticado');
    } catch (err) {
      sesionService.limpiar();
      setUsuario(null);
      setEstado('no_autenticado');
      throw err;
    }
  }, []);

  const cerrarSesion = useCallback(() => sesionService.invalidar(), []);

  const modos = useMemo(() => modosDisponibles(usuario), [usuario]);
  const rol = resolverModo(modos, rolElegido);

  const setRol = useCallback(
    (modo: Rol) => {
      if (!modos.includes(modo)) return;
      setRolElegido(modo);
      escribirModoGuardado(modo);
    },
    [modos],
  );

  const puede = useCallback((codigo: CodigoPermiso) => tienePermiso(usuario, codigo), [usuario]);
  const esAnalista = usuario?.capacidades?.analista === true;

  return (
    <AuthContext.Provider
      value={{ estado, usuario, iniciarSesion, cerrarSesion, rol, modos, setRol, puede, esAnalista }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
