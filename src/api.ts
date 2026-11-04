import type { Role } from './types';

/**
 * Cliente de la API de autenticación (FastAPI) con el contrato de
 * `backend-scytal/prompt_frontend.md`.
 *
 * - Tokens (access / refresh) y `pending_token` viven SOLO EN MEMORIA:
 *   nunca en localStorage (seguridad del proyecto).
 * - En un 401 con token de sesión se intenta UNA vez `POST /auth/refresh`
 *   (rotativo: entrega un par nuevo) y se reintenta la petición; si falla
 *   se limpia la sesión y se avisa al componente raíz.
 * - Errores normalizados en `ApiError { status, code, message, details,
 *   requestId, retryAfter }` según el formato `{ error: {…} }` del backend,
 *   con `X-Request-Id` como "código de reporte".
 */

/** URL base del backend en desarrollo (`VITE_API_URL` en `.env`). */
const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000').replace(/\/+$/, '');

/** Error de la API con el formato estandarizado del backend. */
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

/* ────────────────────────── Tokens (solo memoria) ────────────────────────── */

let access: string | null = null;
let refresh: string | null = null;
let pending: string | null = null;

/** Hay token de sesión (real con refresh, o provisional de una cuenta nueva). */
export const haySesion = (): boolean => access !== null;
/** Hay una verificación TOTP pausada (login modo A). */
export const hayVerificacionPendiente = (): boolean => pending !== null;

export function setVerificacionPendiente(token: string): void {
  pending = token;
}

/** Sustituye el access en curso (p. ej. el provisional de una cuenta nueva). */
export function setAccess(token: string): void {
  access = token;
}

export function limpiarSesion(): void {
  access = null;
  refresh = null;
  pending = null;
}

/* ────────────── Listeners de expiración invocados por la API ─────────────── */

type EscuchaExpiracion = (mensaje: string) => void;
let escucha: EscuchaExpiracion | null = null;

/** Registra a quien se avisa cuando la sesión se invalida en servidor. */
export function onSesionExpirada(fn: EscuchaExpiracion | null): void {
  escucha = fn;
}

/* ───────────────────────────────── Tipos ────────────────────────────────── */

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

/** Respuesta de login con DOS modos (contrato §login). */
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

/* ───────────────────────── Núcleo HTTP + refresh ────────────────────────── */

interface PedirFirma {
  metodo?: string;
  cuerpo?: unknown;
  access?: boolean;
}

async function pedir(path: string, opts: PedirFirma = {}): Promise<unknown> {
  const cabeceras: Record<string, string> = {};
  if (opts.cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
  if (opts.access && access) cabeceras['Authorization'] = `Bearer ${access}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.metodo ?? 'POST',
      headers: cabeceras,
      body: opts.cuerpo === undefined ? undefined : JSON.stringify(opts.cuerpo),
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
    // El backend (FastAPI) envuelve el error: {"detail":{"error":{…}}}; también
    // se acepta el plano {"error":{…}} del contrato y el 422 nativo de FastAPI.
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
    /* cuerpo sin JSON: se queda el mensaje por defecto */
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

  // Si los detalles traen una lista de razones (p. ej. 422 INVALID_PASSWORD),
  // se aplanan al mensaje para mostrarlas todas.
  if (Array.isArray(details)) {
    const causas = (details as unknown[]).filter((d): d is string => typeof d === 'string');
    if (causas.length) message = `${message}${message ? ' · ' : ''}${causas.join(' · ')}`;
  } else if (typeof details === 'string' && details.trim()) {
    message = `${message}${message ? ' · ' : ''}${details}`;
  }

  throw new ApiError({ status: res.status, code, message, details, requestId, retryAfter });
}

/** Petición con `Authorization: Bearer <access>`: 401 → un refresh → un reintento. */
async function autenticado(path: string, opts: { metodo?: string; cuerpo?: unknown } = {}, reintento = false): Promise<unknown> {
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

/* ─────────────────────────────── Endpoints ──────────────────────────────── */

export async function saluteApi(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

/** `POST /auth/register` — crea organización + primer admin (estado `pendiente_2fa`). */
export async function registrar(c: RegistrarCuerpo): Promise<RespuestaRegistro> {
  return (await pedir('/auth/register', { cuerpo: c })) as RespuestaRegistro;
}

/**
 * `POST /auth/login` — dos modos:
 * · B (`must_enroll_totp`): guarda el `provisional_access_token` como access en
 *   memoria (sirve para enroll, confirm, me, logout y password/change).
 * · A (`requires_totp`): guarda el `pending_token` de 5 min.
 */
export async function entrar(correo: string, contrasena: string): Promise<RespuestaLogin> {
  limpiarSesion();
  const r = (await pedir('/auth/login', { cuerpo: { correo, contrasena } })) as RespuestaLogin;
  if (r.must_enroll_totp && r.provisional_access_token) access = r.provisional_access_token;
  else if (r.requires_totp && r.pending_token) pending = r.pending_token;
  return r;
}

/** `POST /auth/login/verify-totp` con el `pending_token` en memoria → par de tokens. */
export async function verificarTotp(codigo: string): Promise<void> {
  const par = (await pedir('/auth/login/verify-totp', {
    cuerpo: { codigo, pending_token: pending },
  })) as ParTokens;
  access = par.access_token;
  refresh = par.refresh_token;
  pending = null;
}

/** `POST /auth/totp/enroll` con access (real o provisional, estado `pendiente_2fa`). */
export async function preparar2FA(): Promise<DatosEnroll> {
  return (await autenticado('/auth/totp/enroll')) as DatosEnroll;
}

/** `POST /auth/totp/confirm` con el primer código → cuenta `activo`. */
export async function confirmar2FA(codigo: string): Promise<void> {
  await autenticado('/auth/totp/confirm', { cuerpo: { codigo } });
  limpiarSesion();
}

/** `GET /auth/me` — datos de la cuenta en sesión. */
export async function yo(): Promise<Yo> {
  return (await autenticado('/auth/me', { metodo: 'GET' })) as Yo;
}

/** `POST /auth/logout` — invalida TODOS los tokens del usuario. Best-effort. */
export async function salir(): Promise<void> {
  try {
    await autenticado('/auth/logout');
  } catch {
    /* el logout avanza igualmente: la sesión local siempre se limpia */
  }
  limpiarSesion();
}

/** `POST /auth/password/change` → tras el cambio TODOS los tokens mueren. */
export async function cambiarContrasena(actual: string, nueva: string): Promise<void> {
  await autenticado('/auth/password/change', {
    cuerpo: { contrasena_actual: actual, contrasena_nueva: nueva },
  });
  limpiarSesion();
}

/** Mapea el rol del backend al rol de la interfaz. */
export function rolInterfaz(rol: string): Role {
  return rol === 'admin_organizacion' || rol === 'admin_plataforma' ? 'org_admin' : 'analyst';
}
