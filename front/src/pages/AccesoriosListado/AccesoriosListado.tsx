import { useMemo, useState } from 'react';
import { AppTopbar } from '../../components/dominio/layout/AppTopbar/AppTopbar';
import { AccesorioFormModal } from '../../components/dominio/modales/AccesorioFormModal/AccesorioFormModal';
import { Button } from '../../components/ui/Button/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog/ConfirmDialog';
import { Table, type TableColumn } from '../../components/ui/Table/Table';
import { useAccesorios } from '../../hooks/useAccesorios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { accesoriosService } from '../../services/accesorios.service';
import { ApiError } from '../../services/httpClient';
import { mensajeDeError } from '../../utils/errors';
import { ETIQUETAS_TIPO_ACCESORIO, TIPOS_ACCESORIO, type Accesorio } from '../../types/accesorio';
import './AccesoriosListado.css';

const medida = (cm: number | null) => (cm != null ? `${cm} cm` : '—');

/** Catálogo de accesorios de montaje (ganchos, bandejas, barras...): alta, edición y baja. */
export function AccesoriosListado() {
  const { puedeEscribir } = useAuth();
  const { accesorios, cargando, recargar } = useAccesorios();
  const { mostrarToast } = useToast();
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('');
  // `undefined` = modal cerrado; `null` = crear; un accesorio = editar.
  const [enFormulario, setEnFormulario] = useState<Accesorio | null | undefined>(undefined);
  const [aEliminar, setAEliminar] = useState<Accesorio | null>(null);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return accesorios.filter(
      (a) => (!q || a.codigo.toLowerCase().includes(q) || a.nombre.toLowerCase().includes(q)) && (!tipo || a.tipo === tipo),
    );
  }, [accesorios, busqueda, tipo]);

  async function eliminar(accesorio: Accesorio) {
    try {
      await accesoriosService.eliminar(accesorio.id);
      mostrarToast('Accesorio eliminado', 'success');
      recargar();
    } catch (err) {
      const usos = err instanceof ApiError && err.status === 409 ? (err.details as { niveles: number; posiciones: number }) : null;
      mostrarToast(
        usos
          ? `No se puede eliminar: lo usan ${usos.niveles} nivel(es) y ${usos.posiciones} posición(es)`
          : mensajeDeError(err, 'No se pudo eliminar el accesorio'),
        'error',
      );
    } finally {
      setAEliminar(null);
    }
  }

  const columnas: TableColumn<Accesorio>[] = [
    { key: 'codigo', header: 'Código', render: (a) => <span className="mono">{a.codigo}</span> },
    { key: 'nombre', header: 'Nombre', render: (a) => a.nombre },
    { key: 'tipo', header: 'Tipo', render: (a) => a.tipo.charAt(0) + a.tipo.slice(1).toLowerCase() },
    { key: 'alto', header: 'Alto', alinear: 'right', render: (a) => medida(a.alto_cm) },
    { key: 'ancho', header: 'Ancho', alinear: 'right', render: (a) => medida(a.ancho_cm) },
    { key: 'profundidad', header: 'Profundidad', alinear: 'right', render: (a) => medida(a.profundidad_cm) },
    ...(puedeEscribir
      ? [{
          key: 'acciones',
          header: 'Acciones',
          alinear: 'right' as const,
          render: (a: Accesorio) => (
            <span className="accesorios-listado__acciones">
              <Button variante="ghost" onClick={() => setEnFormulario(a)}>
                Editar
              </Button>
              <Button variante="ghost" onClick={() => setAEliminar(a)}>
                Eliminar
              </Button>
            </span>
          ),
        }]
      : []),
  ];

  return (
    <div className="accesorios-listado">
      <AppTopbar titulo="Accesorios" />

      <div className="accesorios-listado__contenido">
        <div className="accesorios-listado__barra">
          <span className="accesorios-listado__conteo">
            {cargando && accesorios.length === 0 ? 'Cargando…' : visibles.length === 1 ? '1 accesorio' : `${visibles.length} accesorios`}
          </span>
          <input
            className="accesorios-listado__busqueda"
            type="search"
            placeholder="Buscar por código o nombre"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar accesorio"
          />
          <select className="accesorios-listado__tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Filtrar por tipo">
            <option value="">Todos los tipos</option>
            {TIPOS_ACCESORIO.map((t) => (
              <option key={t} value={t}>
                {ETIQUETAS_TIPO_ACCESORIO[t]}
              </option>
            ))}
          </select>
          {puedeEscribir && <Button onClick={() => setEnFormulario(null)}>+ Crear accesorio</Button>}
        </div>

        {(!cargando || accesorios.length > 0) && (
          <Table<Accesorio>
            columns={columnas}
            rows={visibles}
            rowKey={(a) => a.id}
            vacio={<p className="accesorios-listado__vacio">No hay accesorios que coincidan.</p>}
          />
        )}
      </div>

      {enFormulario !== undefined && (
        <AccesorioFormModal
          accesorio={enFormulario}
          onClose={() => setEnFormulario(undefined)}
          onGuardado={() => {
            setEnFormulario(undefined);
            recargar();
          }}
        />
      )}

      {aEliminar && (
        <ConfirmDialog
          titulo="Eliminar accesorio"
          mensaje={`¿Eliminar ${aEliminar.codigo} · ${aEliminar.nombre}? Solo se puede si ningún nivel ni posición lo usa.`}
          confirmarLabel="Eliminar"
          peligro
          onClose={() => setAEliminar(null)}
          onConfirm={() => eliminar(aEliminar)}
        />
      )}
    </div>
  );
}
