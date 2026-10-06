import { useState } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { ZonaArrastreArchivo } from '../../../ui/ZonaArrastreArchivo/ZonaArrastreArchivo';
import { UsarAdjuntos } from '../../UsarAdjuntos/UsarAdjuntos';
import { extractorPdfPlanogramaService } from '../../../../services/extractorPdfPlanograma.service';
import { archivoABase64 } from '../../../../utils/archivoABase64';
import { useToast } from '../../../../context/ToastContext';
import { mensajeDeError } from '../../../../utils/errors';
import type { ProductoPorUbicar, ResultadoExtraccionPdf } from '../../../../types/extractorPdfPlanograma';
import type { GondolaListItem } from '../../../../types/gondola';
import { RevisionCuerpoPdf } from './RevisionCuerpoPdf';
import {
  construirCuerpoImportar,
  indicePorGancho,
  seleccionInicial,
  type DecisionCuerpo,
  type SeleccionProductos,
} from './importacionPdf';
import './ExtractorPdfPlanogramaModal.css';

/** Mismo tope que valida el back (extractorPdfPlanograma.controller.js). */
const MAX_BYTES_PDF = 15 * 1024 * 1024;

interface ExtractorPdfPlanogramaModalProps {
  versionId: number;
  gondolas: GondolaListItem[];
  /** Productos de la góndola "Por ubicar" (Excel) con sus ganchos: llenan los espacios del PDF
   * que tienen esos mismos números. */
  productosPorUbicar: ProductoPorUbicar[];
  onClose: () => void;
  /** Se llama tras importar, para recargar el lienzo. */
  onImportado: () => void;
}

/**
 * "PDF Planograma": sube la ficha de montaje en PDF, el agente reconstruye el layout (capa 1:
 * cuerpos, secciones, niveles, espacios) e identifica los productos (capa 2). El usuario revisa,
 * decide el destino de cada cuerpo (góndola nueva, reemplazar o no importar) y elige el producto
 * de cada espacio; la importación es una sola transacción en el back.
 */
export function ExtractorPdfPlanogramaModal({ versionId, gondolas, productosPorUbicar, onClose, onImportado }: ExtractorPdfPlanogramaModalProps) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [analizando, setAnalizando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoExtraccionPdf | null>(null);
  const [decisiones, setDecisiones] = useState<Record<string, DecisionCuerpo>>({});
  const [seleccion, setSeleccion] = useState<SeleccionProductos>({});
  // null = el usuario no lo tocó: se activa solo si hay productos en "Por ubicar" (las posiciones
  // del chat se cargan en diferido, así que pueden llegar después de abrir el modal).
  const [eleccionPorUbicar, setUsarPorUbicar] = useState<boolean | null>(null);
  const usarPorUbicar = eleccionPorUbicar ?? productosPorUbicar.length > 0;
  const porGancho = usarPorUbicar && productosPorUbicar.length ? indicePorGancho(productosPorUbicar) : null;
  const { mostrarToast } = useToast();

  async function analizarPdf() {
    if (!archivo || analizando) return;
    setAnalizando(true);
    try {
      const respuesta = await extractorPdfPlanogramaService.analizar({
        pdf_base64: await archivoABase64(archivo),
        nombre_archivo: archivo.name,
      });
      setResultado(respuesta);
      setDecisiones(Object.fromEntries(respuesta.cuerpos.map((c) => [c.clave, { destino: 'NUEVA', nombre: c.nombre }])));
      setSeleccion(seleccionInicial(respuesta.cuerpos));
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo analizar el PDF'), 'error');
    } finally {
      setAnalizando(false);
    }
  }

  const cuerposAImportar = resultado?.cuerpos.filter((c) => decisiones[c.clave]?.destino !== 'OMITIR') ?? [];
  const reemplazos = cuerposAImportar.map((c) => decisiones[c.clave].destino).filter((d) => typeof d === 'number');
  const reemplazoDuplicado = new Set(reemplazos).size !== reemplazos.length;

  async function importar() {
    if (!resultado || importando || cuerposAImportar.length === 0 || reemplazoDuplicado) return;
    setImportando(true);
    try {
      const respuesta = await extractorPdfPlanogramaService.importar(
        versionId,
        cuerposAImportar.map((c) => construirCuerpoImportar(c, decisiones[c.clave], seleccion, resultado.archivo)),
        Boolean(porGancho),
      );
      const posiciones = respuesta.gondolas.reduce((t, g) => t + g.totalPosiciones, 0);
      mostrarToast(
        `Se importaron ${respuesta.gondolas.length} góndola(s) con ${posiciones} posición(es)` +
          (respuesta.desdePorUbicar ? `; ${respuesta.desdePorUbicar} con productos de "Por ubicar"` : ''),
        'success',
      );
      respuesta.advertencias.forEach((a) => mostrarToast(a, 'info'));
      onImportado();
    } catch (err) {
      mostrarToast(mensajeDeError(err, 'No se pudo importar el layout'), 'error');
    } finally {
      setImportando(false);
    }
  }

  if (resultado) {
    return (
      <Modal
        titulo={`Revisión del PDF · ${resultado.archivo}`}
        onClose={importando ? () => {} : onClose}
        ancho="xl"
        footer={
          <>
            <Button variante="outline" onClick={onClose} disabled={importando}>
              Cancelar
            </Button>
            <Button
              variante="primary"
              onClick={importar}
              disabled={importando || cuerposAImportar.length === 0 || reemplazoDuplicado}
            >
              {importando ? 'Importando…' : `Importar al lienzo (${cuerposAImportar.length})`}
            </Button>
          </>
        }
      >
        <div className="revision-pdf">
          <p className="revision-pdf__ayuda">
            Se leyeron {resultado.cuerpos.length} cuerpo(s). Revisá el layout y elegí qué producto va en cada espacio: los
            identificados por su SKU impreso ya vienen asignados <strong>sin confirmar</strong> (con clic derecho en el lienzo
            se confirman o se reasignan); los demás quedan como espacios pendientes.
          </p>
          {productosPorUbicar.length > 0 && (
            <label className="revision-pdf__por-ubicar">
              <input type="checkbox" checked={usarPorUbicar} onChange={(e) => setUsarPorUbicar(e.target.checked)} />
              <span>
                <strong>Llenar con los productos de "Por ubicar"</strong> ({productosPorUbicar.length}): los espacios cuyos ganchos
                coinciden con un producto del Excel lo toman con todos sus datos, confirmado, y sale de "Por ubicar".
              </span>
            </label>
          )}
          {reemplazoDuplicado && (
            <p className="revision-pdf__aviso">Dos cuerpos no pueden reemplazar la misma góndola.</p>
          )}
          {resultado.advertencias.length > 0 && (
            <ul className="revision-pdf__advertencias">
              {resultado.advertencias.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          )}
          {resultado.cuerpos.map((cuerpo) => (
            <RevisionCuerpoPdf
              key={cuerpo.clave}
              cuerpo={cuerpo}
              gondolas={gondolas}
              decision={decisiones[cuerpo.clave]}
              seleccion={seleccion}
              onCambiarDecision={(d) => setDecisiones((actual) => ({ ...actual, [cuerpo.clave]: d }))}
              onElegirProducto={(clave, sku) => setSeleccion((actual) => ({ ...actual, [clave]: sku }))}
              porGancho={porGancho}
            />
          ))}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      titulo="PDF Planograma"
      onClose={analizando ? () => {} : onClose}
      ancho="md"
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={analizando}>
            Cancelar
          </Button>
          <Button variante="primary" onClick={analizarPdf} disabled={!archivo || analizando}>
            {analizando ? 'Analizando…' : 'Analizar PDF'}
          </Button>
        </>
      }
    >
      <div className="revision-pdf">
        <p className="revision-pdf__ayuda">
          Subí la ficha de montaje del planograma en PDF. El agente reconstruye el layout de cada cuerpo
          (secciones, niveles, accesorios y espacios con sus números de gancho) y después identifica los productos contra
          el catálogo.
        </p>
        <ZonaArrastreArchivo
          accept="application/pdf,.pdf"
          formatos="PDF (.pdf)"
          maxBytes={MAX_BYTES_PDF}
          indicacion="Ficha de montaje con los cuerpos y los números de gancho legibles."
          archivo={archivo}
          onSeleccionar={setArchivo}
          disabled={analizando}
        />
        <UsarAdjuntos
          versionId={versionId}
          accept="application/pdf,.pdf"
          maxBytes={MAX_BYTES_PDF}
          onSeleccionar={setArchivo}
          disabled={analizando}
        />
        {analizando && (
          <p className="revision-pdf__ayuda">Leyendo el PDF… puede tardar uno o dos minutos.</p>
        )}
      </div>
    </Modal>
  );
}
