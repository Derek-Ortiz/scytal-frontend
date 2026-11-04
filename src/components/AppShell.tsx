import { useMemo } from 'react';
import type { AlertItem, RecipientRow } from '../data';
import type { Role, Screen, Theme } from '../types';
import { Badge, Logo } from './ui';
import { Icon } from './icons';
import { Dashboard } from '../screens/Dashboard';
import { Campaigns } from '../screens/Campaigns';
import { CampaignWizard } from '../screens/CampaignWizard';
import { CampaignDetail } from '../screens/CampaignDetail';
import { Groups } from '../screens/Groups';
import { Recipient } from '../screens/Recipient';
import { Templates } from '../screens/Templates';
import { TemplateEdit } from '../screens/TemplateEdit';
import { Alerts } from '../screens/Alerts';
import { Maturity } from '../screens/Maturity';
import { Reports } from '../screens/Reports';
import { Settings } from '../screens/Settings';
import { SystemStates } from '../screens/SystemStates';

const NAV: Array<readonly [Screen, string, string]> = [
  ['dashboard', 'grid', 'Dashboard'],
  ['campaigns', 'target', 'Campañas'],
  ['groups', 'users', 'Grupos y destinatarios'],
  ['templates', 'file', 'Plantillas'],
  ['alerts', 'bell', 'Alertas'],
  ['maturity', 'chart', 'Índice de madurez'],
  ['reports', 'file', 'Reportes'],
  ['settings', 'gear', 'Configuración'],
];

const crumbs: Partial<Record<Screen, string>> = {
  dashboard: 'Operaciones · Dashboard',
  campaigns: 'Operaciones · Campañas',
  'campaign-new': 'Operaciones · Campañas · Nueva campaña',
  'campaign-detail': 'Operaciones · Campañas · Resultados',
  groups: 'Operaciones · Grupos y destinatarios',
  recipient: 'Operaciones · Grupos · Perfil individual',
  templates: 'Operaciones · Plantillas',
  'template-edit': 'Operaciones · Plantillas · Editor',
  alerts: 'Operaciones · Alertas',
  maturity: 'Análisis · Índice de madurez',
  reports: 'Análisis · Reportes',
  settings: 'Análisis · Configuración',
  empty: 'Sistema · Estados vacíos',
  loading: 'Sistema · Estados de carga',
};

const navActive = (screen: Screen): string =>
  screen.startsWith('campaign') ? 'campaigns' : screen === 'recipient' ? 'groups' : screen.startsWith('template') ? 'templates' : screen === 'loading' || screen === 'empty' ? 'dashboard' : screen;

/** Estructura interna: sidebar fija, organización activa, navegación agrupada y topbar. */

export function AppShell({
  screen,
  setScreen,
  theme,
  setTheme,
  role,
  setRole,
  alerts,
  setAlerts,
  readonly,
  recipient,
  recipientGroup,
  userEmail,
  onLogout,
  onPasswordChanged,
  onSelectRecipient,
}: {
  screen: Screen;
  setScreen: (s: Screen) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  role: Role;
  setRole: (r: Role) => void;
  alerts: AlertItem[];
  setAlerts: (updater: (prev: AlertItem[]) => AlertItem[]) => void;
  readonly: boolean;
  recipient: RecipientRow | null;
  recipientGroup: string;
  /** Correo del usuario autenticado contra el backend (o null en demo). */
  userEmail: string | null;
  onLogout: () => void;
  onPasswordChanged: (aviso: string) => void;
  onSelectRecipient: (r: RecipientRow, groupName: string) => void;
}) {
  const pendientes = alerts.filter((a) => a.estado === 'Pendiente').length;
  const activo = navActive(screen);

  const content = useMemo(() => {
    switch (screen) {
      case 'dashboard':
        return <Dashboard alerts={alerts} setScreen={setScreen} />;
      case 'campaigns':
        return <Campaigns readonly={readonly} setScreen={setScreen} />;
      case 'campaign-new':
        return <CampaignWizard setScreen={setScreen} />;
      case 'campaign-detail':
        return <CampaignDetail readonly={readonly} />;
      case 'groups':
        return <Groups readonly={readonly} onSelectRecipient={onSelectRecipient} />;
      case 'recipient':
        return <Recipient recipient={recipient} groupName={recipientGroup} />;
      case 'templates':
        return <Templates readonly={readonly} setScreen={setScreen} />;
      case 'template-edit':
        return <TemplateEdit readonly={readonly} setScreen={setScreen} />;
      case 'alerts':
        return <Alerts alerts={alerts} setAlerts={setAlerts} readonly={readonly} />;
      case 'maturity':
        return <Maturity />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings role={role} theme={theme} setTheme={setTheme} onPasswordChanged={onPasswordChanged} />;
      case 'empty':
      case 'loading':
        return <SystemStates mode={screen === 'loading' ? 'loading' : 'empty'} setMode={(m) => setScreen(m === 'loading' ? 'loading' : 'empty')} setScreen={setScreen} />;
      default:
        return <Dashboard alerts={alerts} setScreen={setScreen} />;
    }
  }, [screen, readonly, alerts, recipient, recipientGroup, role, theme]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo />
          <Badge>Enterprise</Badge>
        </div>
        <div className="org-switch">
          <span className="org-avatar">AC</span>
          <span>
            <strong>Acme Corporation</strong>
            <small>Espacio principal</small>
          </span>
          <Icon name="arrow" size={14} />
        </div>
        <nav>
          <span className="nav-label">OPERACIONES</span>
          {NAV.slice(0, 5).map(([id, icon, label]) => (
            <button className={activo === id ? 'active' : ''} onClick={() => setScreen(id)} key={id}>
              <Icon name={icon} />
              <span>{label}</span>
              {id === 'alerts' && pendientes > 0 && <i>{pendientes}</i>}
            </button>
          ))}
          <span className="nav-label">ANÁLISIS Y GESTIÓN</span>
          {NAV.slice(5).map(([id, icon, label]) => (
            <button className={activo === id ? 'active' : ''} onClick={() => setScreen(id)} key={id}>
              <Icon name={icon} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button onClick={() => setScreen('empty')}>
            <Icon name="grid" />
            <span>Estados del sistema</span>
          </button>
          <div className="user-card">
            <span className="avatar">{(userEmail ?? 'AS').slice(0, 2).toUpperCase()}</span>
            <span className="user-data">
              <strong title={userEmail ?? undefined}>{userEmail ? userEmail.split('@')[0] : 'Ana Silva'}</strong>
              <small>{userEmail ?? 'ana.silva@acme.es'}</small>
            </span>
            <button
              className="icon-btn"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              onClick={onLogout}
            >
              <Icon name="logout" size={15} />
            </button>
            <button className="icon-btn" aria-label="Configuración" onClick={() => setScreen('settings')}>
              <Icon name="gear" size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="crumb">
            Acme Corporation <span>/</span> {crumbs[screen] ?? 'Operaciones · Dashboard'}
          </div>
          <div className="top-actions">
            <label className="role-switch">
              <span>Rol</span>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="org_admin">org_admin</option>
                <option value="analyst">analyst</option>
              </select>
            </label>
            <div className="screen-menu">
              <select value="" onChange={(e) => e.target.value && setScreen(e.target.value as Screen)}>
                <option value="" disabled>
                  Ver otras vistas…
                </option>
                <option value="landing">Landing pública</option>
                <option value="login">Login</option>
                <option value="totp">Verificación TOTP</option>
                <option value="onboarding">Enrolamiento 2FA</option>
                <option value="empty">Estados vacíos</option>
                <option value="loading">Estados de carga</option>
              </select>
            </div>
          </div>
        </header>
        <main>{content}</main>
      </div>
    </div>
  );
}
