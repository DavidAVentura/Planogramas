import { useCallback, useEffect, useState } from 'react';
import { seccionesService, skusVersionService } from '../services/secciones.service';
import { useToast } from '../context/ToastContext';
import { mensajeDeError } from '../utils/errors';
import type { DividirSeccionInput, EstructuraSecciones } from '../types/seccion';
import type { SkuMinMaxCambios, SkusDeVersion } from '../types/skuVersion';
import type { GondolaListItem } from '../types/gondola';

/** Estructura de secciones de cada góndola de la versión, indexada por id de góndola. */
export function useSeccionesDeVersion(gondolas: GondolaListItem[]) {
  const [porGondola, setPorGondola] = useState<Record<number, EstructuraSecciones>>({});
  const { mostrarToast } = useToast();
  const idsKey = gondolas.map((g) => g.id).join(',');

  const cargar = useCallback(async () => {
    if (!idsKey) {
      setPorGondola({});
      return;
    }
    try {
      const ids = idsKey.split(',').map(Number);
      const resultados = await Promise.all(ids.map((id) => seccionesService.obtener(id)));
      setPorGondola(Object.fromEntries(resultados.map((r) => [r.gondolaId, r])));
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudieron cargar las secciones'), 'error');
    }
  }, [idsKey, mostrarToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { porGondola, recargar: cargar };
}

/** Operaciones de estructura (dividir, cambiar medida, quitar). Devuelven true si se aplicaron. */
export function useEditarSecciones() {
  const [enviando, setEnviando] = useState(false);
  const { mostrarToast } = useToast();

  async function ejecutar(accion: () => Promise<unknown>, exito: string, error: string): Promise<boolean> {
    setEnviando(true);
    try {
      await accion();
      mostrarToast(exito, 'success');
      return true;
    } catch (err) {
      mostrarToast(mensajeDeError(err, error), 'error');
      return false;
    } finally {
      setEnviando(false);
    }
  }

  return {
    enviando,
    dividir: (gondolaId: number, datos: DividirSeccionInput) =>
      ejecutar(() => seccionesService.dividir(gondolaId, datos), 'Sección dividida', 'No se pudo dividir la sección'),
    redimensionar: (seccionId: number, tamCm: number) =>
      ejecutar(() => seccionesService.redimensionar(seccionId, tamCm), 'Medida actualizada', 'No se pudo cambiar la medida'),
    quitar: (seccionId: number) =>
      ejecutar(() => seccionesService.quitar(seccionId), 'Sección quitada', 'No se pudo quitar la sección'),
  };
}

/** SKU en la versión: totales por SKU y números de gancho calculados. `activo` evita pedirlo si no se muestra. */
export function useSkusDeVersion(versionId: number, activo: boolean) {
  const [datos, setDatos] = useState<SkusDeVersion | null>(null);
  const { mostrarToast } = useToast();

  const cargar = useCallback(async () => {
    if (!activo || !versionId) return;
    try {
      setDatos(await skusVersionService.listar(versionId));
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudieron cargar los SKU de la versión'), 'error');
    }
  }, [versionId, activo, mostrarToast]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function editar(sku: string, cambios: SkuMinMaxCambios): Promise<boolean> {
    try {
      await skusVersionService.editar(versionId, sku, cambios);
      await cargar();
      return true;
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo actualizar el SKU'), 'error');
      return false;
    }
  }

  return { datos, recargar: cargar, editar };
}
