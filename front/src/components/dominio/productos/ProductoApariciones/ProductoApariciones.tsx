import { Link } from 'react-router-dom';
import { Badge } from '../../../ui/Badge/Badge';
import { EstadoBadge } from '../../EstadoBadge/EstadoBadge';
import { useAparicionesProducto } from '../../../../hooks/useProductos';
import { MODO_APARICION_META, TIPO_VERSION_LABEL } from '../../../../constants/productos';
import type { ProductoListado } from '../../../../types/producto';
import './ProductoApariciones.css';

// Versiones que ya están en tienda (o a punto): un producto inactivo ahí requiere acción.
const ESTADOS_EN_TIENDA = ['publicado', 'piloto'];

// Hay góndolas nombradas "01" y otras "Góndola Frontal": solo se antepone la palabra cuando falta.
function nombreGondola(nombre: string): string {
  return /^g[óo]ndola\b/i.test(nombre) ? nombre : `Góndola ${nombre}`;
}

interface ProductoAparicionesProps {
  producto: ProductoListado;
  sustituto: ProductoListado | null;
}

export function ProductoApariciones({ producto, sustituto }: ProductoAparicionesProps) {
  const { apariciones, cargando, error } = useAparicionesProducto(producto.sku);

  if (cargando) return <p className="producto-apariciones__mensaje">Cargando planogramas…</p>;
  if (error) {
    return (
      <p className="producto-apariciones__mensaje producto-apariciones__mensaje--error">
        No se pudieron cargar los planogramas de este producto.
      </p>
    );
  }
  if (apariciones.length === 0) {
    return (
      <p className="producto-apariciones__vacio">
        Este producto no está colocado en ningún planograma vigente. Se puede agregar desde el editor de
        un planograma de su subcategoría.
      </p>
    );
  }

  const enTienda = apariciones.filter((a) => ESTADOS_EN_TIENDA.includes(a.versionEstado)).length;
  const mostrarAlerta = producto.estado !== 'activo' && enTienda > 0;

  return (
    <div className="producto-apariciones">
      {mostrarAlerta && (
        <div role="note" className="producto-apariciones__alerta">
          Producto inactivo, pero sigue colocado en {enTienda}{' '}
          {enTienda === 1 ? 'posición de una versión publicada o en piloto' : 'posiciones de versiones publicadas o en piloto'}.{' '}
          {producto.sku_sustituto
            ? `Sustituto recomendado: ${producto.sku_sustituto}${sustituto ? ` ${sustituto.nombre}` : ''}.`
            : 'No tiene sustituto recomendado en catálogo.'}
        </div>
      )}

      <table className="producto-apariciones__tabla">
        <thead>
          <tr>
            <th>Planograma</th>
            <th>Versión</th>
            <th>Ubicación</th>
            <th>Aparece como</th>
            <th className="producto-apariciones__derecha">Tiendas</th>
            <th>
              <span className="producto-apariciones__oculto">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {apariciones.map((a) => {
            const modo = MODO_APARICION_META[a.modo];
            return (
              <tr key={a.posicionId}>
                <td data-label="Planograma">
                  <div className="producto-apariciones__principal">{a.planograma}</div>
                  <div className="producto-apariciones__secundario">
                    {a.departamento} <EstadoBadge estado={a.planogramaEstado} />
                  </div>
                </td>
                <td data-label="Versión">
                  <div className="producto-apariciones__codigo">{a.codigo}</div>
                  <div className="producto-apariciones__secundario">
                    {TIPO_VERSION_LABEL[a.tipo] ?? a.tipo} <EstadoBadge estado={a.versionEstado} />
                  </div>
                </td>
                <td data-label="Ubicación">
                  {nombreGondola(a.gondola)} · Nivel {a.nivel}
                </td>
                <td data-label="Aparece como">
                  <Badge bg={modo.bg} color={modo.color}>
                    {modo.label}
                  </Badge>
                  {a.cross_externo && <div className="producto-apariciones__secundario">Accesorio colgante externo</div>}
                  {a.decision === 'INACTIVO' && <div className="producto-apariciones__secundario">Posición inactiva</div>}
                </td>
                <td data-label="Tiendas" className="producto-apariciones__derecha">
                  {a.tiendas === 0 ? 'Sin asignar' : a.tiendas === 1 ? '1 tienda' : `${a.tiendas} tiendas`}
                </td>
                <td className="producto-apariciones__derecha">
                  <Link
                    className="producto-apariciones__abrir"
                    to={`/planogramas/${a.planogramaId}/versiones/${a.versionId}/editor`}
                  >
                    Abrir versión
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
