import type { ReactNode } from 'react';
import { RoleSwitch } from '../RoleSwitch/RoleSwitch';
import './AppTopbar.css';

interface AppTopbarProps {
  titulo: string;
  breadcrumb?: ReactNode;
}

export function AppTopbar({ titulo, breadcrumb }: AppTopbarProps) {
  return (
    <header className="app-topbar">
      <div className="app-topbar__marca">
        <div className="app-topbar__isotipo">C</div>
        <div>
          <div className="app-topbar__titulo">{titulo}</div>
          {breadcrumb ?? <div className="app-topbar__eyebrow">CEMACO</div>}
        </div>
      </div>
      <RoleSwitch />
    </header>
  );
}
