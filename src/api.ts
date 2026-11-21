import type { Role } from './types';


const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000').replace(/\/+$/, '');

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly requestId: string | null;
  readonly retryAfter: number | null;

  constructor(init: {
    status: number;
    code?: string;
    message?: string;
    details?: unknown;
    requestId?: string | null;
    retryAfter?: number | null;
  }) {
    super(init.message ?? 'Error inesperado');
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code ?? 'INTERNAL_ERROR';
    this.details = init.details ?? null;
    this.requestId = init.requestId ?? null;
    this.retryAfter = init.retryAfter ?? null;
  }
}


let access: string | null = null;
let refresh: string | null = null;
let pending: string | null = null;

export const haySesion = (): boolean => access !== null;
export const hayVerificacionPendiente = (): boolean => pending !== null;

export function setVerificacionPendiente(token: string): void {
  pending = token;
}

export function setAccess(token: string): void {
  access = token;
}

export function limpiarSesion(): void {
  access = null;
  refresh = null;
  pending = null;
}


type EscuchaExpiracion = (mensaje: string) => void;
let escucha: EscuchaExpiracion | null = null;

export function onSesionExpirada(fn: EscuchaExpiracion | null): void {
  escucha = fn;
}


export interface RegistrarCuerpo {
  correo: string;
  contrasena: string;
  nombre_organizacion: string;
  slug?: string;
}

export interface RespuestaRegistro {
  id_usuarios: string;
  correo: string;
  rol: string;
  estado: string;
  org_id: string | null;
  nombre_organizacion: string;
  slug: string;
}

export interface RespuestaLogin {
  requires_totp: boolean;
  must_enroll_totp: boolean;
  pending_token: string | null;
  provisional_access_token: string | null;
  requires_password_change: boolean;
}

export interface ParTokens {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in_minutes?: number;
}

export interface Yo {
  id_usuarios: string;
  correo: string;
  rol: string;
  estado: 'pendiente_2fa' | 'activo' | 'suspendido' | 'inactivo';
  org_id: string | null;
  activo: boolean;
  totp_habilitado: boolean;
  debe_cambiar_contrasena: boolean;
}

export interface DatosEnroll {
  secreto_en_claro: string;
  uri: string;
  qr_base64: string;
}


interface PedirFirma {
  metodo?: string;
  cuerpo?: unknown;
  access?: boolean;
  archivo?: File;
}

async function pedir(path: string, opts: PedirFirma = {}): Promise<unknown> {
  const cabeceras: Record<string, string> = {};
  if (opts.cuerpo !== undefined && !opts.archivo) cabeceras['Content-Type'] = 'application/json';
  if (opts.access && access) cabeceras['Authorization'] = `Bearer ${access}`;

  let cuerpo: BodyInit | undefined;
  if (opts.archivo) {
    const fd = new FormData();
    fd.append('file', opts.archivo, opts.archivo.name);
    cuerpo = fd;
  } else if (opts.cuerpo !== undefined) {
    cuerpo = JSON.stringify(opts.cuerpo);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.metodo ?? 'POST',
      headers: cabeceras,
      body: cuerpo,
    });
  } catch {
    throw new ApiError({
      status: 0,
      code: 'NETWORK',
      message: `No pudimos conectar con la API en ${API_URL}. Revisa que el backend esté levantado.`,
    });
  }

  const requestId = res.headers.get('X-Request-Id');

  if (res.ok) {
    if (res.status === 204) return null;
    return await res.json().catch(() => null);
  }

  let code = 'INTERNAL_ERROR';
  let message = `Error ${res.status}`;
  let details: unknown = null;
  try {
    const cuerpo = await res.json();
    const err =
      (cuerpo?.error && typeof cuerpo.error === 'object' && cuerpo.error) ||
      (cuerpo?.detail?.error && typeof cuerpo.detail.error === 'object' && cuerpo.detail.error) ||
      null;
    if (err) {
      code = String((err as { code?: unknown }).code ?? code);
      message = String((err as { message?: unknown }).message ?? message);
      details = (err as { details?: unknown }).details ?? null;
    } else if (Array.isArray(cuerpo?.detail)) {
      code = 'VALIDATION_ERROR';
      message = 'Datos no válidos';
      details = cuerpo.detail;
    } else if (typeof cuerpo?.detail === 'string') {
      message = cuerpo.detail;
    }
  } catch {
  }

  let retryAfter: number | null = null;
  if (res.status === 429) {
    const bruto = res.headers.get('Retry-After');
    if (bruto && /^\d+$/.test(bruto.trim())) retryAfter = Number.parseInt(bruto.trim(), 10);
    else if (bruto) {
      const fecha = Date.parse(bruto);
      if (!Number.isNaN(fecha)) retryAfter = Math.max(1, Math.ceil((fecha - Date.now()) / 1000));
    }
    if (retryAfter === null) retryAfter = 60;
  }

  if (Array.isArray(details)) {
    const causas = (details as unknown[]).filter((d): d is string => typeof d === 'string');
    if (causas.length) message = `${message}${message ? ' · ' : ''}${causas.join(' · ')}`;
  } else if (typeof details === 'string' && details.trim()) {
    message = `${message}${message ? ' · ' : ''}${details}`;
  }

  throw new ApiError({ status: res.status, code, message, details, requestId, retryAfter });
}

async function autenticado(
  path: string,
  opts: { metodo?: string; cuerpo?: unknown; archivo?: File } = {},
  reintento = false,
): Promise<unknown> {
  try {
    return await pedir(path, { ...opts, access: true });
  } catch (e) {
    if (!(e instanceof ApiError) || e.status !== 401) throw e;

    if (reintento || !refresh) {
      limpiarSesion();
      const mensaje = e.code === 'INTERNAL_ERROR' ? 'Tu sesión caducó. Inicia sesión de nuevo.' : e.message;
      escucha?.(mensaje);
      throw new ApiError({ status: 401, code: e.code === 'INVALID_TOKEN' ? 'SESSION_INVALIDATED' : e.code, message: mensaje });
    }

    try {
      const par = (await pedir('/auth/refresh', { cuerpo: { refresh_token: refresh } })) as ParTokens;
      access = par.access_token;
      refresh = par.refresh_token;
    } catch {
      limpiarSesion();
      escucha?.('Tu sesión caducó. Inicia sesión de nuevo.');
      throw new ApiError({ status: 401, code: 'SESSION_INVALIDATED', message: 'Tu sesión caducó. Inicia sesión de nuevo.' });
    }

    return autenticado(path, opts, true);
  }
}


export async function saluteApi(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function registrar(c: RegistrarCuerpo): Promise<RespuestaRegistro> {
  return (await pedir('/auth/register', { cuerpo: c })) as RespuestaRegistro;
}

export async function entrar(correo: string, contrasena: string): Promise<RespuestaLogin> {
  limpiarSesion();
  const r = (await pedir('/auth/login', { cuerpo: { correo, contrasena } })) as RespuestaLogin;
  if (r.must_enroll_totp && r.provisional_access_token) access = r.provisional_access_token;
  else if (r.requires_totp && r.pending_token) pending = r.pending_token;
  return r;
}

export async function verificarTotp(codigo: string): Promise<void> {
  const par = (await pedir('/auth/login/verify-totp', {
    cuerpo: { codigo, pending_token: pending },
  })) as ParTokens;
  access = par.access_token;
  refresh = par.refresh_token;
  pending = null;
}

export async function preparar2FA(): Promise<DatosEnroll> {
  return (await autenticado('/auth/totp/enroll')) as DatosEnroll;
}

export async function confirmar2FA(codigo: string): Promise<void> {
  await autenticado('/auth/totp/confirm', { cuerpo: { codigo } });
  limpiarSesion();
}

export async function yo(): Promise<Yo> {
  return (await autenticado('/auth/me', { metodo: 'GET' })) as Yo;
}

export async function salir(): Promise<void> {
  try {
    await autenticado('/auth/logout');
  } catch {
  }
  limpiarSesion();
}

export async function cambiarContrasena(actual: string, nueva: string): Promise<void> {
  await autenticado('/auth/password/change', {
    cuerpo: { contrasena_actual: actual, contrasena_nueva: nueva },
  });
  limpiarSesion();
}

export function rolInterfaz(rol: string): Role {
  return rol === 'admin_organizacion' || rol === 'admin_plataforma' ? 'org_admin' : 'analyst';
}


function consulta(o: Record<string, string | number | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export interface Pagina<T> {
  total: number;
  items: T[];
  limit: number;
  offset: number;
}


export interface MetricasOrganizacion {
  usuarios_activos: number;
  grupos: number;
  destinatarios_activos: number;
  campanas_totales: number;
  campanas_activas: number;
}

export interface Organizacion {
  id_organizaciones: string;
  nombre: string;
  slug: string;
  creado_en: string;
  metricas?: MetricasOrganizacion;
}

export async function crearOrganizacion(b: {
  nombre: string;
  slug?: string;
  correo_admin?: string;
}): Promise<{ organizacion: Organizacion; admin?: { id_usuarios: string; correo: string; contrasena_temporal_enviada?: boolean } | null }> {
  return (await autenticado('/organizations', { cuerpo: b })) as never;
}

export async function listarOrganizaciones(limit = 20, offset = 0): Promise<Pagina<Organizacion>> {
  return (await autenticado(`/organizations${consulta({ limit, offset })}`, { metodo: 'GET' })) as Pagina<Organizacion>;
}

export async function verOrganizacion(id: string): Promise<Organizacion> {
  return (await autenticado(`/organizations/${id}`, { metodo: 'GET' })) as Organizacion;
}

export async function actualizarOrganizacion(id: string, b: { nombre?: string; slug?: string }): Promise<Organizacion> {
  return (await autenticado(`/organizations/${id}`, { metodo: 'PATCH', cuerpo: b })) as Organizacion;
}


export interface UsuarioItem {
  id_usuarios: string;
  correo: string;
  rol: 'admin_organizacion' | 'analista' | 'admin_plataforma';
  estado: string;
  activo: boolean;
  creado_en: string;
}

export async function listarUsuarios(limit = 100, offset = 0): Promise<Pagina<UsuarioItem>> {
  return (await autenticado(`/users${consulta({ limit, offset })}`, { metodo: 'GET' })) as Pagina<UsuarioItem>;
}

export async function invitarUsuario(
  correo: string,
): Promise<{ id_usuarios: string; correo: string; rol: string; estado: string; correo_enviado: boolean }> {
  return (await autenticado('/users/invite', { cuerpo: { correo } })) as never;
}

export async function cambiarRolUsuario(id: string, rol: 'analista' | 'admin_organizacion'): Promise<UsuarioItem> {
  return (await autenticado(`/users/${id}/role`, { metodo: 'PATCH', cuerpo: { rol } })) as UsuarioItem;
}

export async function desactivarUsuario(id: string): Promise<UsuarioItem> {
  return (await autenticado(`/users/${id}/deactivate`, { metodo: 'PATCH' })) as UsuarioItem;
}


export interface MetricasGrupo {
  destinatarios_activos: number;
  indice_promedio: number | null;
}

export interface Grupo {
  id_grupos: string;
  nombre: string;
  perfil: string;
  creado_en: string;
  metricas: MetricasGrupo;
}

export async function crearGrupo(b: { nombre: string; perfil: string }): Promise<Grupo> {
  return (await autenticado('/groups', { cuerpo: b })) as Grupo;
}

export async function listarGrupos(limit = 100, offset = 0): Promise<Pagina<Grupo>> {
  return (await autenticado(`/groups${consulta({ limit, offset })}`, { metodo: 'GET' })) as Pagina<Grupo>;
}

export async function verGrupo(id: string): Promise<Grupo> {
  return (await autenticado(`/groups/${id}`, { metodo: 'GET' })) as Grupo;
}

export async function actualizarGrupo(id: string, b: { nombre?: string; perfil?: string }): Promise<Grupo> {
  return (await autenticado(`/groups/${id}`, { metodo: 'PATCH', cuerpo: b })) as Grupo;
}

export async function borrarGrupo(id: string): Promise<void> {
  await autenticado(`/groups/${id}`, { metodo: 'DELETE' });
}


export interface Destinatario {
  id_destinatarios: string;
  correo: string;
  grupo_id: string;
  activo: boolean;
  creado_en: string;
}

export interface Instantanea {
  campana_id: string | null;
  puntaje_phishing: number;
  nivel: 'alto' | 'medio' | 'bajo' | 'critico';
  creado_en: string;
}

export interface DestinatarioDetalle extends Destinatario {
  historico: Instantanea[];
}

export interface RespuestaCSV {
  total_filas: number;
  creados: number;
  duplicados: number;
  invalidos: number;
  errores: string[];
}

export async function crearDestinatario(b: { correo: string; grupo_id: string }): Promise<Destinatario> {
  return (await autenticado('/recipients', { cuerpo: b })) as Destinatario;
}

export async function importarDestinatariosCSV(archivo: File): Promise<RespuestaCSV> {
  return (await autenticado('/recipients/import', { metodo: 'POST', archivo })) as RespuestaCSV;
}

export async function listarDestinatarios(
  o: { grupo_id?: string; limit?: number; offset?: number } = {},
): Promise<Pagina<Destinatario>> {
  return (await autenticado(`/recipients${consulta(o)}`, { metodo: 'GET' })) as Pagina<Destinatario>;
}

export async function verDestinatario(id: string): Promise<DestinatarioDetalle> {
  return (await autenticado(`/recipients/${id}`, { metodo: 'GET' })) as DestinatarioDetalle;
}

export async function actualizarDestinatario(
  id: string,
  b: { correo?: string; grupo_id?: string },
): Promise<Destinatario> {
  return (await autenticado(`/recipients/${id}`, { metodo: 'PATCH', cuerpo: b })) as Destinatario;
}

export async function desactivarDestinatario(id: string): Promise<Destinatario> {
  return (await autenticado(`/recipients/${id}/deactivate`, { metodo: 'PATCH' })) as Destinatario;
}


export type Canal = 'correo' | 'qr';

export interface Plantilla {
  id_plantillas: string;
  org_id: string | null;
  nombre: string;
  perfil: string;
  canal: Canal;
  asunto: string | null;
  contenido_html: string;
  landing_html: string;
  creado_en: string;
  actualizado_en: string;
  en_uso?: boolean;
}

export async function listarPlantillas(
  o: { perfil?: string; canal?: Canal; limit?: number; offset?: number } = {},
): Promise<Pagina<Plantilla>> {
  return (await autenticado(`/templates${consulta(o)}`, { metodo: 'GET' })) as Pagina<Plantilla>;
}

export async function crearPlantilla(b: {
  nombre: string;
  perfil: string;
  canal: Canal;
  asunto?: string;
  contenido_html: string;
  landing_html: string;
}): Promise<Plantilla> {
  return (await autenticado('/templates', { cuerpo: b })) as Plantilla;
}

export async function importarPlantillaURL(b: {
  url: string;
  nombre?: string;
  perfil?: string;
  canal?: Canal;
  asunto?: string;
}): Promise<Plantilla> {
  return (await autenticado('/templates/importar', { cuerpo: b })) as Plantilla;
}

export async function verPlantilla(id: string): Promise<Plantilla> {
  return (await autenticado(`/templates/${id}`, { metodo: 'GET' })) as Plantilla;
}

export async function actualizarPlantilla(id: string, b: {
  nombre?: string;
  perfil?: string;
  canal?: Canal;
  asunto?: string;
  contenido_html?: string;
  landing_html?: string;
}): Promise<Plantilla> {
  return (await autenticado(`/templates/${id}`, { metodo: 'PATCH', cuerpo: b })) as Plantilla;
}

export async function borrarPlantilla(id: string): Promise<void> {
  await autenticado(`/templates/${id}`, { metodo: 'DELETE' });
}

export async function previsualizarPlantilla(id: string): Promise<{
  url: string;
  expira_en_minutos: number;
}> {
  return (await autenticado(`/templates/${id}/previsualizar`, {
    metodo: 'GET',
  })) as { url: string; expira_en_minutos: number };
}


export type EstadoCampana = 'pendiente' | 'programada' | 'activa' | 'completada' | 'cancelada';

export interface CampanaCanal {
  canal: Canal;
  zonas: string[];
}

export interface Campana {
  id_campanas: string;
  org_id: string;
  grupo_id: string;
  plantilla_id: string | null;
  nombre: string;
  estado: EstadoCampana;
  expiracion_horas: number;
  programada_en: string | null;
  iniciada_en: string | null;
  finalizada_en: string | null;
  feedback_enviado_en: string | null;
  creado_en: string;
  actualizado_en: string;
  canales: CampanaCanal[];
}

export async function listarCampanas(
  o: { estado?: EstadoCampana; grupo_id?: string; limit?: number; offset?: number } = {},
): Promise<Pagina<Campana>> {
  return (await autenticado(`/campaigns${consulta(o)}`, { metodo: 'GET' })) as Pagina<Campana>;
}

export async function crearCampana(b: {
  nombre: string;
  grupo_id: string;
  plantilla_id?: string;
  expiracion_horas?: number;
}): Promise<Campana> {
  return (await autenticado('/campaigns', { cuerpo: b })) as Campana;
}

export async function verCampana(id: string): Promise<Campana> {
  return (await autenticado(`/campaigns/${id}`, { metodo: 'GET' })) as Campana;
}

export async function actualizarCampana(id: string, b: {
  nombre?: string;
  grupo_id?: string;
  plantilla_id?: string;
  expiracion_horas?: number;
}): Promise<Campana> {
  return (await autenticado(`/campaigns/${id}`, { metodo: 'PATCH', cuerpo: b })) as Campana;
}

export async function definirCanalesCampana(
  id: string,
  b: { canales: Canal[]; zonas?: string[] },
): Promise<Campana> {
  return (await autenticado(`/campaigns/${id}/channels`, { cuerpo: b })) as Campana;
}

export async function lanzarCampana(
  id: string,
  expiracion_horas?: number,
): Promise<{ campana: Campana; emails_programados: number; zonas_qr: number }> {
  return (await autenticado(`/campaigns/${id}/launch`, { cuerpo: expiracion_horas ? { expiracion_horas } : {} })) as never;
}

export async function verQRCampana(id: string): Promise<{ campana_id: string; zonas: Array<{ zona: string; url: string; qr_base64: string }> }> {
  return (await autenticado(`/campaigns/${id}/qr`, { metodo: 'GET' })) as never;
}

export interface StatsCampana {
  campana_id: string;
  estado: EstadoCampana;
  total_destinatarios: number;
  enviados: number;
  abiertos: number;
  clics: number;
  subidos: number;
  qr_clics: number;
}

export async function verStatsCampana(id: string): Promise<StatsCampana> {
  return (await autenticado(`/campaigns/${id}/stats`, { metodo: 'GET' })) as StatsCampana;
}

export interface FilaCampanaDestinatario {
  destinatario_id: string;
  correo: string;
  enviado: boolean;
  abrio: boolean;
  clico: boolean;
  subio: boolean;
  expira_en: string;
  vencido: boolean;
  puntaje_phishing: number | null;
  nivel: string | null;
}

export async function verDestinatariosCampana(
  id: string,
  limit = 100,
  offset = 0,
): Promise<Pagina<FilaCampanaDestinatario> & { campana_id: string }> {
  return (await autenticado(`/campaigns/${id}/recipients${consulta({ limit, offset })}`, { metodo: 'GET' })) as never;
}

export async function finalizarCampana(
  id: string,
): Promise<{ campana: Campana; instantaneas: number; alertas: number }> {
  return (await autenticado(`/campaigns/${id}/finish`)) as never;
}

export async function enviarFeedbackCampana(
  id: string,
): Promise<{ ok: boolean; message: string; emails_programados: number }> {
  return (await autenticado(`/campaigns/${id}/send-feedback`)) as never;
}

export async function cancelarCampana(id: string): Promise<Campana> {
  return (await autenticado(`/campaigns/${id}/cancel`)) as Campana;
}
