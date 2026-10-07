// Almacén del JWT CAO del usuario. Se guarda en localStorage para que la sesión sobreviva
// recargas y pestañas nuevas; el backend lo valida contra CAO en cada request.

const CLAVE_TOKEN = 'planogramas.tokenCao';
const CLAVE_RUTA_DESTINO = 'planogramas.rutaDestino';

type Oyente = () => void;
const oyentesInvalidacion = new Set<Oyente>();

function leer(clave: string): string | null {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: string | null): void {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, valor);
  } catch {
    // Sin storage disponible (modo privado estricto): la sesión dura lo que dure la pestaña.
  }
}

export const sesionService = {
  /**
   * Token guardado. No se descarta por su claim `exp`: el keepalive renueva la sesión en CAO sin
   * emitir un JWT nuevo, así que el `exp` original no indica que la sesión venció. Quien decide es
   * CAO (vía backend); si ya no es válida, el 401 invalida la sesión en el interceptor.
   */
  obtenerToken(): string | null {
    return leer(CLAVE_TOKEN);
  },

  guardarToken(token: string): void {
    escribir(CLAVE_TOKEN, token);
  },

  limpiar(): void {
    escribir(CLAVE_TOKEN, null);
  },

  /** Borra el token y avisa a los suscriptores (AuthContext) que la sesión ya no es válida. */
  invalidar(): void {
    escribir(CLAVE_TOKEN, null);
    oyentesInvalidacion.forEach((oyente) => oyente());
  },

  alInvalidar(oyente: Oyente): () => void {
    oyentesInvalidacion.add(oyente);
    return () => oyentesInvalidacion.delete(oyente);
  },

  /** Ruta a la que el usuario intentaba entrar sin sesión; se retoma después de /auth. */
  recordarRutaDestino(ruta: string): void {
    escribir(CLAVE_RUTA_DESTINO, ruta);
  },

  consumirRutaDestino(): string | null {
    const ruta = leer(CLAVE_RUTA_DESTINO);
    escribir(CLAVE_RUTA_DESTINO, null);
    return ruta;
  },
};
