import { useEffect, useState } from 'react';
import type { Screen } from '../types';
import { Badge, Button, Icon, Input, Logo, Otp } from '../components/ui';
import {
  ApiError,
  cambiarContrasena,
  confirmar2FA,
  entrar,
  haySesion,
  hayVerificacionPendiente,
  limpiarSesion,
  preparar2FA,
  registrar,
  saluteApi,
  verificarTotp,
  yo,
  type Yo,
} from '../api';
import { evaluarClave, MINIMO_CLAVE } from '../password';

/** Acceso real conectado al backend (`/auth`):
 *  registro → login (dos modos) → TOTP (enroll o verify) → app.
 *  Contrato: backend-scytal/prompt_frontend.md · Tokens solo en memoria. */

export type AuthMode = 'login' | 'register' | 'totp' | 'onboarding' | 'password';

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SEIS_DIGITOS = /^\d{6}$/;

interface ErrorLocal {
  titulo: string;
  texto: string;
  requestId?: string | null;
}

/** Traduce un error de la API (o inesperado) a un banner local. */
function traducir(e: unknown, titulo: string): ErrorLocal {
  if (!(e instanceof ApiError)) {
    return { titulo, texto: e instanceof Error ? e.message : 'Error inesperado.' };
  }
  const texto =
    e.code === 'INTERNAL_ERROR' && e.requestId ? `${e.message} · código de reporte: ${e.requestId}` : e.message;
  return { titulo, texto, requestId: e.requestId };
}

/** Cuenta atrás para el rate limiting (429 + Retry-After del backend). */
function useReintento(): [number, (segundos: number) => void] {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    if (segundos <= 0) return;
    const id = window.setInterval(() => setSegundos((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [segundos > 0]);

  return [segundos, (n) => setSegundos(Math.max(1, Math.ceil(n)))];
}

function ErrorBanner({ error }: { error: ErrorLocal | null }) {
  if (!error) return null;
  return (
    <div className="error-banner">
      <span>!</span>
      <div>
        <strong>{error.titulo}</strong>
        <p>{error.texto}</p>
      </div>
    </div>
  );
}

export function AuthShell({
  mode,
  notice,
  emailPrefill,
  setScreen,
  setNotice,
  onAuthenticated,
  onEmailPrefill,
}: {
  mode: AuthMode;
  notice: string | null;
  emailPrefill: string | null;
  setScreen: (s: Screen) => void;
  setNotice: (n: string | null) => void;
  onAuthenticated: (me: Yo) => void;
  onEmailPrefill: (correo: string) => void;
}) {
  return (
    <div className="auth-page">
      <div className="auth-top">
        <Logo />
        <button className="auth-exit" onClick={() => setScreen('landing')}>
          Volver al sitio <Icon name="arrow" size={14} />
        </button>
      </div>
      <div className={`auth-card${mode === 'onboarding' ? ' onboarding-card' : ''}`}>
        {notice && (
          <div className="success-banner">
            <Icon name="check" />
            <div>
              <strong>Cuidado con este paso</strong>
              <p>{notice}</p>
            </div>
          </div>
        )}
        {mode === 'login' && <Login setScreen={setScreen} setNotice={setNotice} prefill={emailPrefill} />}
        {mode === 'register' && <Registro setScreen={setScreen} setNotice={setNotice} onEmail={onEmailPrefill} />}
        {mode === 'totp' && <Totp setScreen={setScreen} setNotice={setNotice} onAuthenticated={onAuthenticated} />}
        {mode === 'onboarding' && <Enrolamiento setScreen={setScreen} setNotice={setNotice} />}
        {mode === 'password' && <CambioContrasena setScreen={setScreen} setNotice={setNotice} />}
      </div>
      <div className="auth-legal">Scytal Security · Privacidad · Términos · Estado del servicio</div>
    </div>
  );
}

/* ─────────────────────────────────── Registro ───────────────────────────── */

function Registro({
  setScreen,
  setNotice,
  onEmail,
}: {
  setScreen: (s: Screen) => void;
  setNotice: (n: string | null) => void;
  onEmail: (correo: string) => void;
}) {
  const [correo, setCorreo] = useState('');
  const [organizacion, setOrganizacion] = useState('');
  const [slug, setSlug] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState<ErrorLocal | null>(null);
  const [cargando, setCargando] = useState(false);

  const veredicto = evaluarClave(pass);
  const slugGenerado = slugificar(organizacion);
  const [espera, iniciarEspera] = useReintento();

  async function registrarCuenta() {
    setError(null);
    setNotice(null);
    const correoLimpio = correo.trim().toLowerCase();
    if (!correoLimpio || !REGEX_CORREO.test(correoLimpio)) {
      setError({ titulo: 'Correo no válido', texto: 'Revisa el formato del correo corporativo.' });
      return;
    }
    if (!organizacion.trim()) {
      setError({ titulo: 'Falta el nombre de la organización', texto: 'Se creará un espacio de trabajo con ese nombre.' });
      return;
    }
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setError({ titulo: 'Identificador no válido', texto: 'Usa minúsculas, números y guiones (mi-empresa). Puedes dejarlo vacío.' });
      return;
    }
    if (pass.length < MINIMO_CLAVE) {
      setError({ titulo: 'Contraseña corta', texto: `Mínimo ${MINIMO_CLAVE} caracteres (regla del servidor).` });
      return;
    }
    if (!veredicto.valida) {
      setError({ titulo: 'Contraseña demasiado débil', texto: 'El servidor exige nivel zxcvbn ≥ 3. Añade palabras, números o símbolos.' });
      return;
    }
    setCargando(true);
    try {
      const r = await registrar({
        correo: correoLimpio,
        contrasena: pass,
        nombre_organizacion: organizacion.trim(),
        slug: slug || undefined,
      });
      setNotice(`Cuenta creada en «${r.nombre_organizacion}» (estado: ${r.estado}). Inicia sesión para configurar tu 2FA.`);
      onEmail(correoLimpio);
      setScreen('login');
    } catch (e) {
      setError(traducir(e, 'No pudimos crear la cuenta'));
      if (e instanceof ApiError && e.retryAfter) iniciarEspera(e.retryAfter);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div onKeyDown={(e) => e.key === 'Enter' && void registrarCuenta()}>
      <div className="auth-icon">
        <Icon name="shield" />
      </div>
      <div className="auth-title">Crea tu organización</div>
      <p>Se prepara el acceso del primer administrador con 2FA obligatorio.</p>
      <ErrorBanner error={error} />
      <Input
        label="Correo corporativo"
        placeholder="tu@empresa.com"
        value={correo}
        onChange={setCorreo}
        hint="Se aceptan dominios de desarrollo (.local)."
      />
      <Input label="Nombre de la organización" placeholder="Acme Corporation" value={organizacion} onChange={setOrganizacion} />
      <Input
        label="Identificador (slug), opcional"
        placeholder="mi-empresa"
        value={slug}
        onChange={(v) => setSlug(slugificar(v))}
        hint={slugGenerado && !slug ? `Se generará automáticamente: ${slugGenerado}` : 'Minúsculas, números y guiones.'}
      />
      <Input label="Contraseña" type="password" placeholder="••••••••••" value={pass} onChange={setPass} />
      <Meter pass={pass} veredicto={veredicto} />
      <Button onClick={() => void registrarCuenta()} disabled={cargando || espera > 0}>
        {cargando ? 'Creando cuenta…' : espera > 0 ? `Demasiados intentos: espera ${espera} s…` : 'Crear cuenta'}
      </Button>
      <div className="auth-foot">
        Reglas del servidor: mínimo {MINIMO_CLAVE} caracteres · zxcvbn ≥ 3 · sin filtraciones · sin reutilizar las últimas 3.
      </div>
      <div className="auth-foot">
        ¿Ya tienes cuenta? <button onClick={() => setScreen('login')}>Inicia sesión</button>
      </div>
    </div>
  );
}

/* ───────────────────────────────────── Login ────────────────────────────── */

function Login({
  setScreen,
  setNotice,
  prefill,
}: {
  setScreen: (s: Screen) => void;
  setNotice: (n: string | null) => void;
  prefill: string | null;
}) {
  const [correo, setCorreo] = useState(prefill ?? '');
  const [pass, setPass] = useState('');
  const [error, setError] = useState<ErrorLocal | null>(null);
  const [cargando, setCargando] = useState(false);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [espera, iniciarEspera] = useReintento();

  useEffect(() => {
    let vivo = true;
    saluteApi()
      .then((ok) => {
        if (vivo) setApiOk(ok);
      })
      .catch(() => {
        if (vivo) setApiOk(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  async function continuar() {
    setError(null);
    setNotice(null);
    if (!correo.trim() || !pass.trim()) {
      setError({ titulo: 'No pudimos iniciar sesión', texto: 'Completa el correo y la contraseña para continuar.' });
      return;
    }
    if (!REGEX_CORREO.test(correo.trim())) {
      setError({ titulo: 'Correo no válido', texto: 'Revisa el formato del correo corporativo.' });
      return;
    }
    setCargando(true);
    try {
      const r = await entrar(correo.trim().toLowerCase(), pass);
      if (r.must_enroll_totp && r.provisional_access_token) {
        // Modo B: cuenta nueva sin TOTP → enrolamiento (antes, cambio de contraseña si toca).
        setScreen(r.requires_password_change ? 'password' : 'onboarding');
      } else if (r.requires_totp && r.pending_token) {
        // Modo A: TOTP ya configurado → verificación.
        setScreen('totp');
      } else {
        setError({ titulo: 'Respuesta inesperada', texto: 'El servidor no devolvió un modo de acceso reconocible.' });
      }
    } catch (e) {
      setError(traducir(e, 'No pudimos iniciar sesión'));
      if (e instanceof ApiError && e.retryAfter) iniciarEspera(e.retryAfter);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div onKeyDown={(e) => e.key === 'Enter' && void continuar()}>
      <div className="auth-icon">
        <Icon name="lock" />
      </div>
      <div className="auth-title">Accede a Scytal</div>
      <p>Ingresa con tu cuenta corporativa.</p>
      <ErrorBanner error={error} />
      <Input
        label="Correo corporativo"
        placeholder="tu@empresa.com"
        value={correo}
        onChange={setCorreo}
        error={error && !REGEX_CORREO.test(correo.trim()) ? 'Formato no válido' : undefined}
      />
      <Input
        label="Contraseña"
        type="password"
        placeholder="••••••••••"
        value={pass}
        onChange={setPass}
        error={error && !pass.trim() ? 'Campo requerido' : undefined}
      />
      <button className="forgot">¿Olvidaste tu contraseña?</button>
      <Button onClick={() => void continuar()} disabled={cargando || espera > 0}>
        {cargando ? 'Comprobando…' : espera > 0 ? `Demasiados intentos: espera ${espera} s…` : 'Continuar'}
      </Button>
      <div className="api-status">
        <span className={`api-dot${apiOk === false ? ' bad' : apiOk === null ? ' wait' : ''}`} />
        {apiOk === null ? 'Comprobando la API local…' : apiOk ? 'API local conectada' : 'API local no responde (¿backend levantado?)'}
      </div>
      <div className="auth-foot">El correo se normaliza a minúsculas al enviar.</div>
      <div className="auth-foot">
        ¿Primer acceso? <button onClick={() => setScreen('register')}>Crea tu organización</button>
      </div>
    </div>
  );
}

/* ──────────────────────────── TOTP (modo A: verify) ─────────────────────── */

function Totp({
  setScreen,
  setNotice,
  onAuthenticated,
}: {
  setScreen: (s: Screen) => void;
  setNotice: (n: string | null) => void;
  onAuthenticated: (me: Yo) => void;
}) {
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<ErrorLocal | null>(null);
  const [cargando, setCargando] = useState(false);
  const [espera, iniciarEspera] = useReintento();

  const pendiente = hayVerificacionPendiente();
  const seis = SEIS_DIGITOS.test(codigo);

  async function verificar() {
    setError(null);
    setNotice(null);
    if (!pendiente) {
      setError({ titulo: 'Verificación no iniciada', texto: 'Vuelve a iniciar sesión para generar una verificación nueva.' });
      return;
    }
    if (!seis) {
      setError({ titulo: 'Código incompleto', texto: 'Introduce los 6 dígitos del código actual de tu app autenticadora.' });
      return;
    }
    setCargando(true);
    try {
      await verificarTotp(codigo);
      const me = await yo();
      onAuthenticated(me);
      if (me.estado === 'pendiente_2fa') setScreen('onboarding');
      else if (me.debe_cambiar_contrasena) setScreen('password');
      else setScreen('dashboard');
    } catch (e) {
      setError(traducir(e, 'No pudimos verificar el código'));
      if (e instanceof ApiError && e.retryAfter) iniciarEspera(e.retryAfter);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div onKeyDown={(e) => e.key === 'Enter' && void verificar()}>
      <div className="auth-icon">
        <Icon name="shield" />
      </div>
      <div className="auth-title">Verifica tu identidad</div>
      <p>Introduce el código de 6 dígitos de tu app autenticadora.</p>
      <ErrorBanner error={error} />
      <Otp value={codigo} onChange={setCodigo} />
      <p className="otp-note">Códigos cada 30 s · un código ya usado se rechaza siempre (control de replay).</p>
      <Button onClick={() => void verificar()} disabled={!seis || cargando || espera > 0}>
        {cargando ? 'Verificando…' : espera > 0 ? `Demasiados intentos: espera ${espera} s…` : 'Verificar y acceder'}
      </Button>
      <div className="auth-foot">
        ¿No eres tú?{' '}
        <button
          onClick={() => {
            limpiarSesion();
            setScreen('login');
          }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

/* ───────────────────────────── Enrolamiento real ────────────────────────── */

function Enrolamiento({ setScreen, setNotice }: { setScreen: (s: Screen) => void; setNotice: (n: string | null) => void }) {
  const [datos, setDatos] = useState<Awaited<ReturnType<typeof preparar2FA>> | null>(null);
  const [error, setError] = useState<ErrorLocal | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardado, setGuardado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [espera, iniciarEspera] = useReintento();

  const sinSesion = !haySesion();
  const seis = SEIS_DIGITOS.test(codigo);

  useEffect(() => {
    let vivo = true;
    setCargando(true);
    preparar2FA()
      .then((d) => {
        if (vivo) setDatos(d);
      })
      .catch((e) => {
        if (vivo) setError(traducir(e, 'No pudimos iniciar el enrolamiento'));
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  async function confirmar() {
    setError(null);
    setNotice(null);
    if (!datos) return;
    if (!seis) {
      setError({ titulo: 'Código incompleto', texto: 'Introduce los 6 dígitos del primer código generado.' });
      return;
    }
    setConfirmando(true);
    try {
      await confirmar2FA(codigo);
      setNotice('2FA activado. Tu cuenta está lista: inicia sesión de nuevo para entrar a la plataforma.');
      setScreen('login');
    } catch (e) {
      setError(traducir(e, 'No pudimos activar el 2FA'));
      if (e instanceof ApiError && e.retryAfter) iniciarEspera(e.retryAfter);
    } finally {
      setConfirmando(false);
    }
  }

  return (
    <>
      <div className="onboard-head">
        <div className="auth-icon">
          <Icon name="shield" />
        </div>
        <div>
          <Badge tone="alto">Configuración obligatoria</Badge>
          <div className="auth-title">Activa tu doble factor</div>
          <p>Escanea con Google Authenticator, 1Password u otra app compatible.</p>
        </div>
      </div>
      {sinSesion ? (
        <>
          <ErrorBanner error={{ titulo: 'Sin sesión temporal', texto: 'No hay enrolamiento en curso. Inicia sesión primero.' }} />
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setScreen('login')}>
              Ir al inicio de sesión
            </Button>
          </div>
        </>
      ) : (
        <div className="onboard-body">
          <div className="qr-box">
            {datos ? (
              <img
                className="qr-img"
                alt="Código QR de enrolamiento TOTP"
                src={datos.qr_base64.startsWith('data:') ? datos.qr_base64 : `data:image/png;base64,${datos.qr_base64}`}
              />
            ) : (
              <div className="qr-espera">{cargando ? '···' : ''}</div>
            )}
          </div>
          <div className="onboard-steps">
            <div>
              <span>1</span>
              <p>
                Abre tu app autenticadora y selecciona <strong>Agregar cuenta</strong>.
              </p>
            </div>
            <div>
              <span>2</span>
              <p>Escanea el QR o usa esta clave manual (se muestra una sola vez):</p>
            </div>
            {datos && (
              <div className="secret-row">
                <code>{guardado ? '●●●● ●●●● ●●●● ●●●●' : datos.secreto_en_claro.replace(/(.{4})/g, '$1 ').trim()}</code>
                <button
                  className="mini-boton"
                  onClick={() => {
                    setGuardado(true);
                    navigator.clipboard
                      ?.writeText(datos.secreto_en_claro)
                      .then(() => {
                        setCopiado(true);
                        window.setTimeout(() => setCopiado(false), 1600);
                      })
                      .catch(() => {
                        /* sin permiso de portapapeles */
                      });
                  }}
                >
                  {copiado ? 'Copiado ✓' : 'Copiar y marcar como guardado'}
                </button>
              </div>
            )}
            <div>
              <span>3</span>
              <p>Confirma con el primer código que genere tu app.</p>
            </div>
            <Otp value={codigo} onChange={setCodigo} />
            {cargando && <p className="cargando-nota">Generando secreto y QR…</p>}
            {error && <ErrorBanner error={error} />}
            <Button onClick={() => void confirmar()} disabled={!seis || confirmando || cargando || !datos || espera > 0}>
              {confirmando ? 'Activando…' : espera > 0 ? `Demasiados intentos: espera ${espera} s…` : 'Activar y continuar'}
            </Button>
          </div>
        </div>
      )}
      <div className="warning-box">
        <Icon name="lock" />
        <div>
          <strong>Se muestra una sola vez</strong>
          <p>El servidor no vuelve a entregar este secreto: guárdalo ya en tu app autenticadora.</p>
        </div>
      </div>
    </>
  );
}

/* ────────────────────────────── Cambio de contraseña ────────────────────── */

function CambioContrasena({ setScreen, setNotice }: { setScreen: (s: Screen) => void; setNotice: (n: string | null) => void }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [error, setError] = useState<ErrorLocal | null>(null);
  const [cargando, setCargando] = useState(false);
  const [espera, iniciarEspera] = useReintento();

  const veredicto = evaluarClave(nueva);
  const activo = haySesion();

  async function actualizar() {
    setError(null);
    setNotice(null);
    if (!activo) {
      setError({ titulo: 'Sin sesión activa', texto: 'Inicia sesión para cambiar tu contraseña.' });
      setScreen('login');
      return;
    }
    if (!actual.trim()) {
      setError({ titulo: 'Falta la contraseña actual', texto: 'El servidor la verifica antes de aceptar la nueva.' });
      return;
    }
    if (nueva.length < MINIMO_CLAVE) {
      setError({ titulo: 'Contraseña corta', texto: `La nueva debe tener mínimo ${MINIMO_CLAVE} caracteres.` });
      return;
    }
    if (!veredicto.valida) {
      setError({ titulo: 'Contraseña demasiado débil', texto: 'El servidor exige nivel zxcvbn ≥ 3 para la nueva contraseña.' });
      return;
    }
    if (nueva === actual) {
      setError({ titulo: 'Contraseña repetida', texto: 'La nueva debe ser distinta de la actual.' });
      return;
    }
    setCargando(true);
    try {
      await cambiarContrasena(actual, nueva);
      setNotice('Contraseña actualizada. Todos los tokens fueron invalidados: vuelve a iniciar sesión.');
      setScreen('login');
    } catch (e) {
      setError(traducir(e, 'No pudimos cambiar la contraseña'));
      if (e instanceof ApiError && e.retryAfter) iniciarEspera(e.retryAfter);
    } finally {
      setCargando(false);
    }
  }

  return (
    <div onKeyDown={(e) => e.key === 'Enter' && void actualizar()}>
      <div className="auth-icon">
        <Icon name="lock" />
      </div>
      <div className="auth-title">Cambia tu contraseña</div>
      <p>Es requerida antes de continuar con la configuración de tu acceso.</p>
      <ErrorBanner error={error} />
      <Input label="Contraseña actual" type="password" placeholder="••••••••••" value={actual} onChange={setActual} />
      <Input label="Nueva contraseña" type="password" placeholder="••••••••••••" value={nueva} onChange={setNueva} />
      <Meter pass={nueva} veredicto={veredicto} />
      <Button onClick={() => void actualizar()} disabled={cargando || espera > 0}>
        {cargando ? 'Actualizando…' : espera > 0 ? `Demasiados intentos: espera ${espera} s…` : 'Actualizar contraseña'}
      </Button>
      <div className="auth-foot">Al cambiarla se invalidan TODAS las sesiones previas.</div>
      <div className="auth-foot">
        ¿No es el momento? <button onClick={() => setScreen('login')}>Volver al inicio</button>
      </div>
    </div>
  );
}

/* ───────────────────────────────── Piezas comunes ───────────────────────── */

function slugificar(v: string): string {
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

/** Medidor zxcvbn (mismas reglas que el backend: ≥ 10 caracteres y score ≥ 3). */
function Meter({ pass, veredicto }: { pass: string; veredicto: ReturnType<typeof evaluarClave> }) {
  if (!pass) return null;
  return (
    <div className="strength">
      <div className="strength-track">
        <span className={veredicto.cls} style={{ width: `${(veredicto.score + 1) * 20}%` }}></span>
      </div>
      <span className={veredicto.cls}>
        {veredicto.etiqueta} · se agrieta en {veredicto.tiempo}
      </span>
    </div>
  );
}
