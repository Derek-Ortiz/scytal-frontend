/** Vistas navegables de toda la aplicación (estado local, sin router). */
export type Screen =
  | 'landing'
  | 'login'
  | 'totp'
  | 'onboarding'
  | 'register'
  | 'password'
  | 'dashboard'
  | 'campaigns'
  | 'campaign-new'
  | 'campaign-detail'
  | 'groups'
  | 'recipient'
  | 'templates'
  | 'template-edit'
  | 'alerts'
  | 'maturity'
  | 'reports'
  | 'settings'
  | 'empty'
  | 'loading';

/** Niveles de riesgo semánticos. */
export type Risk = 'Bajo' | 'Medio' | 'Alto' | 'Crítico';

/** Roles de la aplicación. Los destinatarios de campaña no acceden a la plataforma. */
export type Role = 'org_admin' | 'analyst';

/** Tema de la interfaz, cambiado desde Configuración → Cuenta. */
export type Theme = 'light' | 'dark';

/** Vistas de la pantalla "Estados del sistema". */
export type SystemStateMode = 'empty' | 'loading';
