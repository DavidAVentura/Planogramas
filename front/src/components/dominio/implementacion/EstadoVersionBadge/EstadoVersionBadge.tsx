import { Badge } from '../../../ui/Badge/Badge';
import { ESTADO_VERSION_IMPLEMENTACION_META } from '../../../../constants/implementacion';
import { ESTADO_META } from '../../EstadoBadge/EstadoBadge';
import type { EstadoVersionImplementacion } from '../../../../types/implementacion';

/**
 * "Publicada" / "Piloto": la versión que la tienda monta. En Por versión puede llegar otro estado
 * (borrador, archivada…): se muestra con el badge general de estados.
 */
export function EstadoVersionBadge({ estado }: { estado: string }) {
  const meta = ESTADO_VERSION_IMPLEMENTACION_META[estado as EstadoVersionImplementacion] ??
    ESTADO_META[estado] ?? { label: estado, bg: 'var(--ink-100)', color: 'var(--fg-2)' };
  return (
    <Badge bg={meta.bg} color={meta.color}>
      {meta.label}
    </Badge>
  );
}
