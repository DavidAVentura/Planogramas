import { useCallback, useEffect, useState } from 'react';
import { accesoriosService } from '../services/accesorios.service';
import { useToast } from '../context/ToastContext';
import { mensajeDeError } from '../utils/errors';
import type { Accesorio } from '../types/accesorio';

export function useAccesorios(tipo?: string) {
  const [accesorios, setAccesorios] = useState<Accesorio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);
  const { mostrarToast } = useToast();

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(false);
    try {
      setAccesorios(await accesoriosService.listar(tipo));
    } catch (err) {
      setFallo(true);
      mostrarToast(mensajeDeError(err, 'No se pudo cargar el catálogo de accesorios'), 'error');
    } finally {
      setCargando(false);
    }
  }, [tipo, mostrarToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { accesorios, cargando, fallo, recargar: cargar };
}
