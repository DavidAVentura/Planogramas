import { useState } from 'react';
import { ConfirmDialog } from '../../../ui/ConfirmDialog/ConfirmDialog';
import { AgenteExtractorChat } from '../AgenteExtractorChat/AgenteExtractorChat';
import { ResumenBorradorModal } from '../../modales/ResumenBorradorModal/ResumenBorradorModal';
import { ExtractorImagenNumeradaModal } from '../../modales/ExtractorImagenNumeradaModal/ExtractorImagenNumeradaModal';
import { SeleccionarMetodoExtraccionModal } from '../../modales/SeleccionarMetodoExtraccionModal/SeleccionarMetodoExtraccionModal';
import { ExtractorVisionCatalogoModal } from '../../modales/ExtractorVisionCatalogoModal/ExtractorVisionCatalogoModal';
import { ExtractorLienzoModal } from '../../modales/ExtractorLienzoModal/ExtractorLienzoModal';
import { ExtractorJCv2Modal } from '../../modales/ExtractorJCv2Modal/ExtractorJCv2Modal';
import { ExtractorPdfPlanogramaModal } from '../../modales/ExtractorPdfPlanogramaModal/ExtractorPdfPlanogramaModal';
import { ImportarExcelProductosModal } from '../../modales/ImportarExcelProductosModal/ImportarExcelProductosModal';
import { useAgenteExtractor } from '../../../../hooks/useAgenteExtractor';
import { useNivelesDeVersion } from '../../../../hooks/useNiveles';
import { usePosicionesDeNiveles } from '../../../../hooks/usePosiciones';
import { useAccesorios } from '../../../../hooks/useAccesorios';
import { usePosicionFlotante } from '../../../../hooks/usePosicionFlotante';
import { construirContextoAgente } from '../../../../utils/agenteExtractorContexto';
import type { GondolaListItem } from '../../../../types/gondola';
import './AgenteExtractorBubble.css';

const ANCHO_BURBUJA = 88;
const ALTO_BURBUJA = 48;
const ANCHO_PANEL = 360;
const ALTO_PANEL = 520;

type MetodoExtraccion = 'ninguno' | 'elegir' | 'imagen-numerada' | 'vision-catalogo' | 'lienzo' | 'jcv2' | 'pdf' | 'excel';

interface AgenteExtractorBubbleProps {
  puedeEscribir: boolean;
  versionId: number;
  /** Todas las góndolas de la versión — el agente opera sobre la versión completa, no solo la
   * góndola activa en pantalla. */
  gondolas: GondolaListItem[];
  /** Góndola visible en pantalla — es la que se usa como "fixture" para el extractor por fotos
   * (IA visual), ya que las fotos que suba el usuario son de ese mueble puntual. Sin góndolas en
   * la versión no hay ninguna: el chat sigue disponible pero la extracción queda bloqueada. */
  gondolaActiva?: GondolaListItem | null;
  categoria: string;
  subcategorias: string[];
  onConfirmado: () => void;
  /** Abre el modal de crear góndola de la página — se ofrece cuando el usuario intenta extraer
   * de otra fuente sin tener todavía ninguna góndola. */
  onCrearGondola: () => void;
  /** Habilita el modo voz del chat (dictado + lectura en voz alta). Hoy solo en el Lienzo. */
  modoVoz?: boolean;
}

export function AgenteExtractorBubble({
  puedeEscribir,
  versionId,
  gondolas,
  gondolaActiva,
  categoria,
  subcategorias,
  onConfirmado,
  onCrearGondola,
  modoVoz = false,
}: AgenteExtractorBubbleProps) {
  const [abierto, setAbierto] = useState(false);
  const [mostrarResumen, setMostrarResumen] = useState(false);
  const [metodoExtraccion, setMetodoExtraccion] = useState<MetodoExtraccion>('ninguno');
  const [avisoSinGondola, setAvisoSinGondola] = useState(false);
  const [confirmarReestablecer, setConfirmarReestablecer] = useState(false);

  // Carga perezosa: solo se pide el detalle de niveles/posiciones de toda la versión cuando el
  // chat está abierto, para no pegarle a la API de cada góndola en cada carga del editor.
  const { niveles, recargar: recargarNiveles } = useNivelesDeVersion(gondolas, abierto);
  const { porNivel: posicionesPorNivel, recargar: recargarPosiciones } = usePosicionesDeNiveles(niveles);
  const { accesorios } = useAccesorios();

  // Productos de la góndola "Por ubicar" (Excel) con ganchos: el importador de PDF los usa para
  // llenar los espacios con esos mismos números.
  const idsPorUbicar = new Set(gondolas.filter((g) => g.por_ubicar).map((g) => g.id));
  const productosPorUbicar = niveles
    .filter((n) => idsPorUbicar.has(n.gondolaId))
    .flatMap((n) => posicionesPorNivel[n.id]?.posiciones ?? [])
    .filter((p) => p.ganchos?.length)
    .map((p) => ({ sku: p.sku, nombre: p.producto?.nombre ?? p.nombre_detectado ?? p.sku ?? 'Sin nombre', ganchos: p.ganchos! }));

  const contexto = construirContextoAgente(gondolas, niveles, posicionesPorNivel, accesorios, subcategorias);
  const agente = useAgenteExtractor(contexto, versionId);

  const { pos, iniciarArrastre, consumirArrastre, anclarEsquina } = usePosicionFlotante(ANCHO_BURBUJA, ALTO_BURBUJA);

  if (!puedeEscribir) return null;

  function alternar() {
    if (consumirArrastre()) return;
    if (abierto) {
      anclarEsquina(ANCHO_PANEL, ALTO_PANEL, ANCHO_BURBUJA, ALTO_BURBUJA);
    } else {
      anclarEsquina(ANCHO_BURBUJA, ALTO_BURBUJA, ANCHO_PANEL, ALTO_PANEL);
    }
    setAbierto(!abierto);
  }

  // El selector siempre se abre: "PDF Planograma" y "Excel de productos" crean sus propias
  // góndolas, así que sirven en una versión vacía. Los métodos por foto trabajan sobre la góndola activa y la exigen.
  function extraerDeOtraFuente() {
    setMetodoExtraccion('elegir');
  }

  function elegirMetodoConGondola(metodo: MetodoExtraccion) {
    if (!gondolaActiva) {
      setMetodoExtraccion('ninguno');
      setAvisoSinGondola(true);
      return;
    }
    setMetodoExtraccion(metodo);
  }

  return (
    <>
      <div className="agente-extractor-widget" style={{ left: pos.x, top: pos.y }}>
        {abierto ? (
          <AgenteExtractorChat
            mensajes={agente.mensajes}
            borrador={agente.borrador}
            listoParaConfirmar={agente.listoParaConfirmar}
            enviando={agente.enviando}
            onEnviar={agente.enviar}
            onReenviar={agente.reenviar}
            onExtraerImagen={extraerDeOtraFuente}
            onRevisar={() => setMostrarResumen(true)}
            onColapsar={alternar}
            onReestablecer={() => setConfirmarReestablecer(true)}
            onArrastreHeader={(e) => iniciarArrastre(e, ANCHO_PANEL, ALTO_PANEL)}
            modoVoz={modoVoz}
          />
        ) : (
          <button
            type="button"
            className="agente-extractor-bubble"
            onPointerDown={(e) => iniciarArrastre(e, ANCHO_BURBUJA, ALTO_BURBUJA)}
            onClick={alternar}
            title="Agente extractor del planograma"
          >
            Chat
          </button>
        )}
      </div>

      {avisoSinGondola && (
        <ConfirmDialog
          titulo="Sin góndolas"
          mensaje="Debes crear una góndola primero."
          confirmarLabel="Crear góndola"
          onClose={() => setAvisoSinGondola(false)}
          onConfirm={() => {
            setAvisoSinGondola(false);
            onCrearGondola();
          }}
        />
      )}

      {confirmarReestablecer && (
        <ConfirmDialog
          titulo="Reestablecer chat"
          mensaje="Se borrará el historial de la conversación y el borrador pendiente de esta versión. ¿Deseas continuar?"
          confirmarLabel="Reestablecer"
          peligro
          onClose={() => setConfirmarReestablecer(false)}
          onConfirm={() => {
            setConfirmarReestablecer(false);
            agente.reestablecer();
          }}
        />
      )}

      {metodoExtraccion === 'elegir' && (
        <SeleccionarMetodoExtraccionModal
          onClose={() => setMetodoExtraccion('ninguno')}
          onSeleccionarImagenNumerada={() => elegirMetodoConGondola('imagen-numerada')}
          onSeleccionarVisionCatalogo={() => elegirMetodoConGondola('vision-catalogo')}
          onSeleccionarLienzo={() => elegirMetodoConGondola('lienzo')}
          onSeleccionarJCv2={() => elegirMetodoConGondola('jcv2')}
          onSeleccionarPdf={() => setMetodoExtraccion('pdf')}
          onSeleccionarExcel={() => setMetodoExtraccion('excel')}
        />
      )}

      {metodoExtraccion === 'excel' && (
        <ImportarExcelProductosModal
          versionId={versionId}
          onClose={() => setMetodoExtraccion('ninguno')}
          onImportado={() => {
            setMetodoExtraccion('ninguno');
            recargarNiveles();
            recargarPosiciones();
            onConfirmado();
          }}
        />
      )}

      {metodoExtraccion === 'pdf' && (
        <ExtractorPdfPlanogramaModal
          versionId={versionId}
          gondolas={gondolas}
          productosPorUbicar={productosPorUbicar}
          onClose={() => setMetodoExtraccion('ninguno')}
          onImportado={() => {
            setMetodoExtraccion('ninguno');
            recargarNiveles();
            recargarPosiciones();
            onConfirmado();
          }}
        />
      )}

      {metodoExtraccion === 'imagen-numerada' && (
        <ExtractorImagenNumeradaModal
          onClose={() => setMetodoExtraccion('ninguno')}
          onAceptar={(mensaje) => {
            setMetodoExtraccion('ninguno');
            agente.enviar(mensaje);
          }}
        />
      )}

      {metodoExtraccion === 'vision-catalogo' && gondolaActiva && (
        <ExtractorVisionCatalogoModal
          subcategorias={subcategorias}
          gondola={gondolaActiva}
          categoria={categoria}
          onClose={() => setMetodoExtraccion('ninguno')}
          onAceptar={(mensaje) => {
            setMetodoExtraccion('ninguno');
            agente.enviar(mensaje);
          }}
        />
      )}

      {metodoExtraccion === 'lienzo' && gondolaActiva && (
        <ExtractorLienzoModal
          subcategorias={subcategorias}
          gondolas={gondolas}
          versionId={versionId}
          gondola={gondolaActiva}
          categoria={categoria}
          onClose={() => setMetodoExtraccion('ninguno')}
          onAceptar={() => {
            setMetodoExtraccion('ninguno');
            recargarNiveles();
            recargarPosiciones();
            onConfirmado();
          }}
        />
      )}

      {metodoExtraccion === 'jcv2' && gondolaActiva && (
        <ExtractorJCv2Modal
          subcategorias={subcategorias}
          gondolas={gondolas}
          versionId={versionId}
          gondola={gondolaActiva}
          categoria={categoria}
          onClose={() => setMetodoExtraccion('ninguno')}
          onAceptar={() => {
            setMetodoExtraccion('ninguno');
            recargarNiveles();
            recargarPosiciones();
            onConfirmado();
          }}
        />
      )}

      {mostrarResumen && (
        <ResumenBorradorModal
          borrador={agente.borrador}
          versionId={versionId}
          gondolas={gondolas}
          niveles={niveles}
          posicionesPorNivel={posicionesPorNivel}
          accesorios={accesorios}
          onClose={() => setMostrarResumen(false)}
          onConfirmado={() => {
            // No cierra el modal todavía: se queda mostrando el resumen de resultados
            // (ejecutada/fallida/omitida por acción) hasta que el usuario lo cierre a mano.
            setAbierto(false);
            agente.limpiarBorrador();
            recargarNiveles();
            recargarPosiciones();
            onConfirmado();
          }}
        />
      )}
    </>
  );
}
