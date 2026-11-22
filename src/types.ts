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

export type Risk = 'Bajo' | 'Medio' | 'Alto' | 'Crítico';

export type Role = 'org_admin' | 'analyst';

export type Theme = 'light' | 'dark';

export type SystemStateMode = 'empty' | 'loading';
