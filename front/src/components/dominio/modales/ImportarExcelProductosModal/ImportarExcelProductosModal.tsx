import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal } from '../../../ui/Modal/Modal';
import { Button } from '../../../ui/Button/Button';
import { Badge } from '../../../ui/Badge/Badge';
import { Table, type TableColumn } from '../../../ui/Table/Table';
import { ZonaArrastreArchivo } from '../../../ui/ZonaArrastreArchivo/ZonaArrastreArchivo';
import { UsarAdjuntos } from '../../UsarAdjuntos/UsarAdjuntos';
import { AccesorioFormModal } from '../AccesorioFormModal/AccesorioFormModal';
import { useAccesorios } from '../../../../hooks/useAccesorios';
import { useToast } from '../../../../context/ToastContext';
import { importacionProductosService } from '../../../../services/importacionProductos.service';
import { ApiError } from '../../../../services/httpClient';
import {
  agruparAccesorios,
  AVISO_SIN_TIPO,
  bloqueoDeLectura,
  erroresDeCatalogo,
  leerExcelProductos,
  siglaBloque,
  type AvisoBloqueo,
  type ErrorLectura,
  type LecturaExcelProductos,
} from '../../../../utils/excelProductosPlanograma';
import { mensajeDeError } from '../../../../utils/errors';
import { normalizarCodigoAccesorio } from '../../../../domain/accesorios/codigoAccesorio';
import { textoGanchos } from '../../../../domain/ganchos/gancho';
import { TIPO_TIENDA_META } from '../../../../constants/tiendas';
import type { VersionTipo } from '../../../../types/version';
import type { AccesorioExcel, ProductoExcel } from '../../../../types/importacionProductos';
import type { TipoAccesorioCatalogo } from '../../../../types/accesorio';
import './ImportarExcelProductosModal.css';

interface ImportarExcelProductosModalProps {
  versionId: number;
  /** Tipo de la versión destino: decide el bloque TG/TM/TE del Excel. Sin tipo no se lee. */
  tipoVersion: VersionTipo | undefined;
  onClose: () => void;
  /** Se llama tras importar, para recargar el lienzo. */
  onImportado: () => void;
}

/** El Excel se lee en el navegador; el tope evita colgar la pestaña con archivos que no son el listado. */
const MAX_BYTES_EXCEL = 10 * 1024 * 1024;
/** Errores que se listan a la vez; el resto se ve al corregir y volver a cargar. */
const MAX_ERRORES_VISIBLES = 100;
/** Grupos de accesorios que se muestran por producto en la vista previa. */
const MAX_GRUPOS_ACCESORIO = 3;

/** Tipo sugerido para dar de alta un accesorio que trae el Excel (el usuario lo puede cambiar). */
function tipoSugerido(codigo: string, tamano: number | null): TipoAccesorioCatalogo {
  if (/^S[A-Z]{2}\b|\*/.test(codigo) || (tamano ?? 0) >= 18) return 'BANDEJA';
  if (/^R\d/.test(codigo)) return 'GANCHO';
  return 'OTRO';
}

const cantidad = (n: number | null) => (n === null ? '—' : n);

/** El 422 de accesorio inexistente trae `details.codigos`; el de versión no editable no. */
function traeCodigos(details: unknown): boolean {
  return typeof details === 'object' && details !== null && Array.isArray((details as { codigos?: unknown }).codigos);
}

/** Bloque de aviso de la vista de errores: recibe el foco al aparecer para que el lector de pantalla lo anuncie. */
function BloqueoErrores({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div ref={ref} id="importar-excel-bloqueo" className="importar-excel__bloqueo" role="alert" tabIndex={-1}>
      {children}
    </div>
  );
}

function NotaOmitidas({ omitidas }: { omitidas: LecturaExcelProductos['filasOmitidas'] }) {
  if (!omitidas.length) return null;
  return (
    <div className="importar-excel__omitidas">
      {omitidas.length} fila(s) se omiten (sin SKU o sin facings); no es un error.
      <details>
        <summary>Ver filas</summary>
        <ul>
          {omitidas.map((f) => (
            <li key={f.fila}>
              Fila {f.fila}: {f.motivo}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function AccesoriosDeProducto({ accesorios }: { accesorios: AccesorioExcel[] }) {
  if (!accesorios.length) return <>—</>;
  const grupos = agruparAccesorios(accesorios);
  const visibles = grupos.slice(0, MAX_GRUPOS_ACCESORIO);
  const ocultos = grupos.slice(MAX_GRUPOS_ACCESORIO).reduce((total, g) => total + g.cantidad, 0);
  const lista = grupos
    .map((g) => `${g.cantidad > 1 ? `${g.cantidad} × ` : ''}${g.codigo}${g.tamano_pulgadas ? ` · ${g.tamano_pulgadas}"` : ''}`)
    .join('\n');
  return (
    <ul className="importar-excel__accesorios" title={ocultos ? lista : undefined}>
      {visibles.map((g, i) => (
        <li key={`${g.codigo}-${g.tamano_pulgadas}-${i}`}>
          {g.cantidad > 1 ? `${g.cantidad} × ` : ''}
          <span className="mono">{g.codigo}</span>
          {g.tamano_pulgadas ? ` · ${g.tamano_pulgadas}"` : ''}
        </li>
      ))}
      {ocultos > 0 && <li aria-label={`${ocultos} accesorios más`}>+{ocultos} más</li>}
    </ul>
  );
}

const columnasErrores: TableColumn<ErrorLectura>[] = [
  { key: 'fila', header: 'Fila', alinear: 'right', render: (e) => <span className="mono">{e.fila}</span> },
  { key: 'columna', header: 'Columna', render: (e) => `${e.columna} (${e.letra})` },
  { key: 'motivo', header: 'Motivo', render: (e) => <span className="importar-excel__motivo">{e.motivo}</span> },
  { key: 'esperado', header: 'Cómo debe venir', render: (e) => <span className="importar-excel__esperado">{e.esperado}</span> },
];

/**
 * "Excel de productos": lee el listado de productos del planograma (ganchos, cantidades, mín./máx.,
 * accesorios de montaje...) y lo importa a la góndola "Por ubicar" de la versión, una posición por
 * SKU. El analista después arrastra cada producto a su lugar real en el lienzo.
 *
 * Del archivo se lee solo el bloque (TG/TM/TE) que corresponde al tipo de la versión; si el
 * archivo no lo trae o está vacío, se avisa en el paso 1 y no se importa nada.
 *
 * Todo o nada: si el archivo trae errores, o algún accesorio sigue sin existir en el catálogo al
 * pulsar Importar, se muestra la vista de errores y no se envía nada.
 */
export function ImportarExcelProductosModal({ versionId, tipoVersion, onClose, onImportado }: ImportarExcelProductosModalProps) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [importando, setImportando] = useState(false);
  const [bloqueoLectura, setBloqueoLectura] = useState<AvisoBloqueo | null>(null);
  const [lectura, setLectura] = useState<LecturaExcelProductos | null>(null);
  const [erroresCatalogo, setErroresCatalogo] = useState<ErrorLectura[] | null>(null);
  const [accesorioAlta, setAccesorioAlta] = useState<{ codigo: string; tipo: TipoAccesorioCatalogo } | null>(null);
  const { accesorios, cargando: cargandoCatalogo, fallo: falloCatalogo, recargar: recargarAccesorios } = useAccesorios();
  const { mostrarToast } = useToast();

  const aviso = tipoVersion ? bloqueoLectura : AVISO_SIN_TIPO;
  const metaTipo = tipoVersion ? TIPO_TIENDA_META[tipoVersion] : null;

  function seleccionar(nuevo: File | null) {
    setArchivo(nuevo);
    setBloqueoLectura(null);
  }

  async function leer() {
    if (!archivo || leyendo || !tipoVersion) return;
    setLeyendo(true);
    setBloqueoLectura(null);
    try {
      const resultado = await leerExcelProductos(archivo, tipoVersion);
      const bloqueo = bloqueoDeLectura(resultado);
      if (bloqueo) {
        setBloqueoLectura(bloqueo);
      } else if (resultado.columnasFaltantes.length) {
        mostrarToast(`El archivo no tiene las columnas: ${resultado.columnasFaltantes.join(', ')}`, 'error');
      } else if (resultado.errores.length === 0 && !resultado.productos.length) {
        mostrarToast('El archivo no tiene productos para importar', 'error');
      } else {
        setLectura(resultado);
      }
    } catch {
      mostrarToast('No se pudo leer el archivo. Verifica que sea un Excel (.xlsx).', 'error');
    } finally {
      setLeyendo(false);
    }
  }

  function cargarOtroArchivo() {
    setLectura(null);
    setArchivo(null);
    setBloqueoLectura(null);
    setErroresCatalogo(null);
  }

  const codigosCatalogo = new Set(accesorios.map((a) => normalizarCodigoAccesorio(a.codigo)));
  // Sin catálogo (cargando o con error) no se puede afirmar que un código no existe; si falló, decide el back (422).
  const verificarCatalogo = !cargandoCatalogo && !falloCatalogo;
  const faltantes = (() => {
    if (!verificarCatalogo) return [];
    const porCodigo = new Map<string, AccesorioExcel>();
    lectura?.productos.forEach((p) => p.accesorios.forEach((a) => {
      const clave = normalizarCodigoAccesorio(a.codigo);
      if (!codigosCatalogo.has(clave) && !porCodigo.has(clave)) porCodigo.set(clave, a);
    }));
    return [...porCodigo.entries()];
  })();

  async function importar() {
    if (!lectura || importando || cargandoCatalogo || lectura.errores.length) return;
    const errs = !verificarCatalogo ? [] : erroresDeCatalogo(lectura.origenesAccesorio, codigosCatalogo);
    if (errs.length) {
      setErroresCatalogo(errs);
      return;
    }
    setImportando(true);
    try {
      const r = await importacionProductosService.importar(versionId, lectura.productos);
      mostrarToast(
        r.totalImportados
          ? `Se importaron ${r.totalImportados} producto(s) a la góndola "Por ubicar"`
          : 'No se importó ningún producto nuevo',
        r.totalImportados ? 'success' : 'info',
      );
      if (r.omitidos.length) mostrarToast(`${r.omitidos.length} omitido(s): ${r.omitidos.map((o) => `${o.sku} (${o.motivo.toLowerCase()})`).join(', ')}`, 'info');
      r.advertencias.forEach((a) => mostrarToast(a, 'info'));
      onImportado();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && Array.isArray(err.details) && typeof err.details[0] === 'string') {
        mostrarToast(`No se pudo importar: ${err.details[0]}. Corrige el archivo y vuelve a cargarlo.`, 'error');
      } else if (err instanceof ApiError && traeCodigos(err.details)) {
        // El catálogo cambió entre la vista previa y el envío.
        recargarAccesorios();
        mostrarToast(err.message, 'error');
      } else {
        mostrarToast(mensajeDeError(err, 'No se pudo importar el Excel'), 'error');
      }
    } finally {
      setImportando(false);
    }
  }

  const columnas: TableColumn<ProductoExcel>[] = [
    { key: 'sku', header: 'SKU', render: (p) => <span className="mono">{p.sku}</span> },
    { key: 'descripcion', header: 'Descripción', render: (p) => p.descripcion ?? '—' },
    { key: 'ganchos', header: 'Ganchos', render: (p) => (p.ganchos.length ? textoGanchos(p.ganchos) : '—') },
    { key: 'facings', header: 'Facings', alinear: 'right', render: (p) => p.facings_horizontal },
    { key: 'unidades', header: 'Cant. × facing', alinear: 'right', render: (p) => p.unidades_por_facing },
    { key: 'vertical', header: 'Vertical', alinear: 'right', render: (p) => p.cantidad_apilable },
    { key: 'minest', header: 'Mín. estético', alinear: 'right', render: (p) => cantidad(p.min_estetico) },
    { key: 'cap', header: 'Capacidad', alinear: 'right', render: (p) => cantidad(p.capacidad_maxima) },
    { key: 'accesorio', header: 'Accesorio', render: (p) => <AccesoriosDeProducto accesorios={p.accesorios} /> },
    { key: 'perfil', header: 'Perfil', render: (p) => p.perfil_redondeo ?? '—' },
    { key: 'minmax', header: 'Mín./Máx.', alinear: 'right', render: (p) => `${cantidad(p.min_final)} / ${cantidad(p.max_final)}` },
    { key: 'decision', header: 'Decisión', render: (p) => p.decision ?? '—' },
  ];

  if (accesorioAlta) {
    return (
      <AccesorioFormModal
        accesorio={null}
        inicial={{ codigo: accesorioAlta.codigo, nombre: accesorioAlta.codigo, tipo: accesorioAlta.tipo }}
        onClose={() => setAccesorioAlta(null)}
        onGuardado={() => {
          setAccesorioAlta(null);
          recargarAccesorios();
        }}
      />
    );
  }

  if (lectura && (erroresCatalogo || lectura.errores.length > 0)) {
    const origenCatalogo = erroresCatalogo !== null;
    const errores = erroresCatalogo ?? lectura.errores;
    const filasConError = new Set(errores.map((e) => e.fila)).size;
    const codigosFaltantes = new Set(
      lectura.origenesAccesorio.filter((o) => !codigosCatalogo.has(o.codigo)).map((o) => o.codigo),
    ).size;
    return (
      <Modal
        titulo={`Errores del archivo · ${archivo?.name ?? ''}`}
        onClose={onClose}
        ancho="xl"
        footer={
          origenCatalogo ? (
            <>
              <Button variante="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button variante="outline" onClick={cargarOtroArchivo}>
                Cargar otro archivo
              </Button>
              <Button variante="primary" onClick={() => setErroresCatalogo(null)}>
                Volver a la vista previa
              </Button>
            </>
          ) : (
            <>
              <Button variante="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                variante="outline"
                disabled
                aria-describedby="importar-excel-bloqueo"
                title="Corrige los errores del archivo para poder importar"
              >
                Importar a "Por ubicar"
              </Button>
              <Button variante="primary" onClick={cargarOtroArchivo}>
                Cargar otro archivo
              </Button>
            </>
          )
        }
      >
        <div className="importar-excel">
          <BloqueoErrores>
            <strong>No se importó nada</strong>
            <span>
              {origenCatalogo
                ? `${codigosFaltantes} accesorio(s) del archivo no existen en el catálogo (${filasConError} fila(s)). Dalos de alta desde la vista previa o corrige el nombre en el archivo y cárgalo de nuevo.`
                : `Encontramos ${errores.length} error(es) en ${filasConError} fila(s). Para importar, todas las filas del archivo deben estar correctas. Corrige el archivo en Excel, cárgalo de nuevo y luego importa.`}
            </span>
          </BloqueoErrores>

          <div className="importar-excel__tabla">
            <Table<ErrorLectura>
              columns={columnasErrores}
              rows={errores.slice(0, MAX_ERRORES_VISIBLES)}
              rowKey={(e) => `${e.fila}-${e.letra}-${e.motivo}`}
            />
          </div>
          {errores.length > MAX_ERRORES_VISIBLES && (
            <p className="importar-excel__ayuda">
              Se muestran los primeros {MAX_ERRORES_VISIBLES} de {errores.length} errores. Corrige estos y vuelve a cargar el archivo para ver el resto.
            </p>
          )}
          <NotaOmitidas omitidas={lectura.filasOmitidas} />
        </div>
      </Modal>
    );
  }

  if (lectura) {
    return (
      <Modal
        titulo={`Productos del Excel · ${archivo?.name ?? ''}`}
        onClose={importando ? () => {} : onClose}
        ancho="xl"
        footer={
          <>
            <Button variante="outline" onClick={onClose} disabled={importando}>
              Cancelar
            </Button>
            <Button variante="primary" onClick={importar} disabled={importando || cargandoCatalogo || lectura.errores.length > 0}>
              {importando ? 'Importando…' : `Importar a "Por ubicar" (${lectura.productos.length})`}
            </Button>
          </>
        }
      >
        <div className="importar-excel">
          <p className="importar-excel__ayuda">
            {lectura.productos.length} producto(s) · Bloque{' '}
            {metaTipo && (
              <Badge bg={metaTipo.bg} color={metaTipo.color}>
                {lectura.bloque} · {metaTipo.label}
              </Badge>
            )}
            {lectura.planogramas.length ? ` del planograma ${lectura.planogramas.join(', ')}` : ''}. Se colocan en la góndola
            "Por ubicar" (10 por nivel, en orden de gancho) con todos sus datos; después los arrastras a su lugar en el lienzo. Los
            SKU que ya están en la versión se omiten.
          </p>

          {faltantes.length > 0 && (
            <div className="importar-excel__faltantes" role="note">
              <strong>Accesorios que no están en el catálogo</strong>
              <span>Dalos de alta antes de importar. Si alguno sigue faltando, no se importará nada.</span>
              <ul>
                {faltantes.map(([codigo, accesorio]) => (
                  <li key={codigo}>
                    <span className="mono">{codigo}</span>
                    <Button
                      variante="outline"
                      onClick={() => setAccesorioAlta({ codigo, tipo: tipoSugerido(codigo, accesorio.tamano_pulgadas) })}
                    >
                      Dar de alta
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <NotaOmitidas omitidas={lectura.filasOmitidas} />

          <div className="importar-excel__tabla">
            <Table<ProductoExcel> columns={columnas} rows={lectura.productos} rowKey={(p) => p.sku} />
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      titulo="Excel de productos"
      onClose={leyendo ? () => {} : onClose}
      ancho="md"
      footer={
        <>
          <Button variante="outline" onClick={onClose} disabled={leyendo}>
            Cancelar
          </Button>
          <Button
            variante="primary"
            onClick={leer}
            disabled={!archivo || leyendo || !tipoVersion}
            title={tipoVersion ? undefined : 'No se pudo determinar el tipo de tienda de la versión'}
          >
            {leyendo ? 'Leyendo…' : 'Leer archivo'}
          </Button>
        </>
      }
    >
      <div className="importar-excel">
        <p className="importar-excel__ayuda">
          Sube el Excel del planograma (una fila por SKU con sus ganchos, facings, cantidades, mín./máx., accesorio y
          observaciones).{' '}
          {tipoVersion && metaTipo
            ? `Esta versión es de Tienda ${metaTipo.label.toLowerCase()}: se lee solo el bloque ${siglaBloque(tipoVersion)} del archivo. `
            : ''}
          Se lee la primera hoja; la jerarquía, marca, modelo, temporada y sustitución no se importan.
        </p>
        <ZonaArrastreArchivo
          accept=".xlsx"
          formatos="Excel (.xlsx)"
          maxBytes={MAX_BYTES_EXCEL}
          indicacion="Una fila por SKU; se lee solo la primera hoja."
          archivo={archivo}
          onSeleccionar={seleccionar}
          disabled={leyendo}
        />
        <UsarAdjuntos
          versionId={versionId}
          accept=".xlsx"
          maxBytes={MAX_BYTES_EXCEL}
          onSeleccionar={seleccionar}
          disabled={leyendo}
        />
        {aviso && (
          <BloqueoErrores key={aviso.detalle}>
            <strong>{aviso.titulo}</strong>
            <span>{aviso.detalle}</span>
          </BloqueoErrores>
        )}
      </div>
    </Modal>
  );
}
