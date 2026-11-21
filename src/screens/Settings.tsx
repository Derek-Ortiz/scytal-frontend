import { useCallback, useEffect, useState } from 'react';
import type { Role, Theme } from '../types';
import { Badge, Button, Card, DataTable, Icon, Input, PageHeader, QrPattern, SectionTitle } from '../components/ui';
import { ApiError, cambiarContrasena, cambiarRolUsuario, desactivarUsuario, invitarUsuario, listarUsuarios, verOrganizacion, actualizarOrganizacion, type Organizacion, type UsuarioItem, type Yo } from '../api';
import { evaluarClave, MINIMO_CLAVE } from '../password';
import { AVISO, filtrarClave } from '../filtros';


type Tab = 'account' | 'security' | 'users';

export function Settings({
  role,
  theme,
  setTheme,
  user,
  onPasswordChanged,
}: {
  role: Role;
  theme: Theme;
  setTheme: (t: Theme) => void;
  user: Yo | null;
  onPasswordChanged: (aviso: string) => void;
}) {
  const [tab, setTab] = useState<Tab>('account');

  return (
    <>
      <PageHeader
        eyebrow="Administración"
        title="Configuración"
        description="Cuenta, seguridad y usuarios de la organización."
      />
      <div className="tab-bar">
        <button className={tab === 'account' ? 'active' : ''} onClick={() => setTab('account')}>
          Cuenta
        </button>
        <button className={tab === 'security' ? 'active' : ''} onClick={() => setTab('security')}>
          Seguridad y 2FA
        </button>
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
          Usuarios
        </button>
      </div>

      {tab === 'account' && <Cuenta role={role} theme={theme} setTheme={setTheme} user={user} />}
      {tab === 'security' && <Seguridad onPasswordChanged={onPasswordChanged} />}
      {tab === 'users' && <Usuarios user={user} readonly={role !== 'org_admin'} />}
    </>
  );
}

const NOMBRE_ROL: Record<string, string> = {
  admin_organizacion: 'Administrador de organización',
  admin_plataforma: 'Administrador de plataforma',
  analista: 'Analista',
};

function Cuenta({
  role,
  theme,
  setTheme,
  user,
}: {
  role: Role;
  theme: Theme;
  setTheme: (t: Theme) => void;
  user: Yo | null;
}) {
  const [org, setOrg] = useState<Organizacion | null>(null);
  const [nombreOrg, setNombreOrg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!user?.org_id) return;
    let vivo = true;
    verOrganizacion(user.org_id)
      .then((o) => {
        if (!vivo) return;
        setOrg(o);
        setNombreOrg(o.nombre);
      })
      .catch(() => {
        if (vivo) setError('No pudimos cargar los datos de tu organización.');
      });
    return () => {
      vivo = false;
    };
  }, [user?.org_id]);

  const guardarOrg = async () => {
    if (!org) return;
    const nombre = nombreOrg.trim();
    if (!nombre || nombre === org.nombre) return;
    setGuardando(true);
    setError(null);
    try {
      const o = await actualizarOrganizacion(org.id_organizaciones, { nombre });
      setOrg(o);
      setAviso('Organización actualizada correctamente.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos actualizar la organización.');
    } finally {
      setGuardando(false);
    }
  };

  const puedeEditar = role === 'org_admin' && !!org;

  return (
    <>
      <div className="settings-grid">
        <Card>
          <SectionTitle title="Datos personales" description="Proviene de tu cuenta del backend; el correo no se puede cambiar." />
          <div className="detail-list">
            {(
              [
                ['Correo', user?.correo ?? '—'],
                ['Rol', NOMBRE_ROL[user?.rol ?? ''] ?? user?.rol ?? '—'],
                ['Estado', user?.estado ?? '—'],
                ['2FA', user?.totp_habilitado ? 'Activado (obligatorio)' : 'Pendiente de activar'],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle title="Organización" description="Datos de tu espacio de trabajo (§7)." />
          {aviso && (
            <div className="success-banner">
              <Icon name="check" />
              <div>
                <strong>Listo</strong>
                <p>{aviso}</p>
              </div>
            </div>
          )}
          {error && (
            <div className="error-banner">
              <span>!</span>
              <div>
                <strong>No pudimos actualizar</strong>
                <p>{error}</p>
              </div>
            </div>
          )}
          {org ? (
            <>
              <Input label="Nombre de la organización" value={nombreOrg} onChange={setNombreOrg} disabled={!puedeEditar} hint={puedeEditar ? 'Admin de la organización puede renombrarla.' : 'Solo lectura para tu rol.'} />
              <div className="detail-list">
                {(
                  [
                    ['ID de organización', org.id_organizaciones],
                    ['Slug', org.slug],
                    ['Creada', fechaCorta(org.creado_en)],
                    ['Usuarios activos', String(org.metricas?.usuarios_activos ?? '—')],
                    ['Grupos', String(org.metricas?.grupos ?? '—')],
                    ['Destinatarios activos', String(org.metricas?.destinatarios_activos ?? '—')],
                    ['Campañas', `${org.metricas?.campanas_activas ?? '—'} activas de ${org.metricas?.campanas_totales ?? '—'}`],
                  ] as const
                ).map(([k, v]) => (
                  <div key={k}>
                    <span>{k}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
              {puedeEditar && (
                <div className="form-actions">
                  <Button onClick={() => void guardarOrg()} disabled={guardando || nombreOrg.trim() === org.nombre}>
                    {guardando ? 'Guardando…' : 'Guardar cambios'}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="section-desc">
              {user?.org_id ? 'Cargando organización…' : 'Tu cuenta no pertenece a una organización (admin de plataforma).'}
            </p>
          )}
        </Card>
      </div>

      <Card className="appearance-card">
        <div className="appearance-copy">
          <span className="appearance-icon">
            <Icon name={theme === 'dark' ? 'moon' : 'sun'} />
          </span>
          <div>
            <div className="section-title">Apariencia</div>
            <div className="section-desc">Elige cómo quieres visualizar Scytal en este dispositivo.</div>
          </div>
        </div>
        <div className="theme-selector" role="group" aria-label="Tema">
          <button className={theme === 'light' ? 'active' : ''} onClick={() => setTheme('light')}>
            <Icon name="sun" size={15} /> Claro
          </button>
          <button className={theme === 'dark' ? 'active' : ''} onClick={() => setTheme('dark')}>
            <Icon name="moon" size={15} /> Oscuro
          </button>
        </div>
      </Card>
    </>
  );
}

function Seguridad({ onPasswordChanged }: { onPasswordChanged: (aviso: string) => void }) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [seed, setSeed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const veredicto = evaluarClave(nueva);
  const suficiente = nueva.length >= MINIMO_CLAVE && veredicto.valida && actual.trim().length > 0;

  async function actualizar() {
    setError(null);
    if (nueva === actual.trim()) {
      setError('La contraseña nueva debe ser distinta de la actual.');
      return;
    }
    setEnviando(true);
    try {
      await cambiarContrasena(actual.trim(), nueva);
      onPasswordChanged('Contraseña actualizada. Las sesiones quedaron invalidadas y debes volver a iniciar sesión.');
    } catch (e) {
      setError(e instanceof ApiError ? `${e.message}` : 'No pudimos actualizar la contraseña.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="settings-grid">
      <Card>
        <SectionTitle
          title="Cambiar contraseña"
          description={`Mínimo ${MINIMO_CLAVE} caracteres y zxcvbn ≥ 3 (también lo valida el servidor).`}
        />
        {error && (
          <div className="error-banner">
            <span>!</span>
            <div>
              <strong>No pudimos actualizar</strong>
              <p>{error}</p>
            </div>
          </div>
        )}
        <Input
          label="Contraseña actual"
          type="password"
          value={actual}
          onChange={(v) => setActual(filtrarClave(v))}
          hint={AVISO.clave}
        />
        <Input
          label="Nueva contraseña"
          type="password"
          value={nueva}
          onChange={(v) => {
            setNueva(filtrarClave(v));
            setError(null);
          }}
          hint={`Mínimo ${MINIMO_CLAVE} caracteres · ${AVISO.clave} · el historial no admite las últimas 3.`}
        />
        <div className="strength">
          <div className="strength-track">
            <span className={veredicto.cls} style={{ width: veredicto.score < 0 ? '0%' : `${(veredicto.score + 1) * 20}%` }}></span>
          </div>
          <span className={veredicto.cls}>
            {veredicto.etiqueta} · se agrieta en {veredicto.tiempo}
          </span>
        </div>
        <div className="breach-ok">
          <Icon name="shield" size={16} />
          <span>HIBP (k-anonimato) + historial: comprobado en el servidor al enviar.</span>
        </div>
        <div className="form-actions">
          <Button onClick={() => void actualizar()} disabled={!suficiente || enviando}>
            {enviando ? 'Actualizando…' : 'Actualizar contraseña'}
          </Button>
        </div>
      </Card>
      <Card>
        <SectionTitle title="Autenticación de dos factores" description="Obligatoria para todas las cuentas (no se puede deshabilitar)." />
        <div className="twofa-status">
          <span className="security-icon">
            <Icon name="lock" />
          </span>
          <div>
            <strong>2FA activo</strong>
            <p>Configurado con una app autenticadora en tu enrolamiento inicial.</p>
          </div>
          <Badge tone="bajo">Protegida</Badge>
        </div>
        <div className="twofa-actions">
          <div className="qr-mini">
            <QrPattern variant={seed} />
          </div>
          <div>
            <Button variant="secondary" icon="qr" onClick={() => setSeed((s) => s + 1)}>
              Regenerar código QR
            </Button>
            <p className="twofa-hint">
              La clave se sincronizará con tu app autenticadora en el próximo código.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Usuarios({ user, readonly }: { user: Yo | null; readonly: boolean }) {
  const [usuarios, setUsuarios] = useState<UsuarioItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'aviso'; texto: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      const pagina = await listarUsuarios(100, 0);
      setUsuarios(pagina.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos cargar los usuarios.');
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const invitar = async () => {
    const correo = nuevoCorreo.trim();
    if (!correo.includes('@')) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await invitarUsuario(correo);
      setAviso(
        r.correo_enviado
          ? { tipo: 'ok', texto: `Invitación enviada a ${r.correo}. Recibirá su contraseña temporal por correo (MailHog en desarrollo).` }
          : { tipo: 'aviso', texto: `Se creó la cuenta de ${r.correo} pero el correo NO pudo enviarse (SMTP falló).` },
      );
      setNuevoCorreo('');
      setShowForm(false);
      await cargar();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos invitar al usuario.');
    } finally {
      setEnviando(false);
    }
  };

  const cambiarRol = async (u: UsuarioItem) => {
    const nuevo = u.rol === 'admin_organizacion' ? 'analista' : 'admin_organizacion';
    setError(null);
    try {
      await cambiarRolUsuario(u.id_usuarios, nuevo);
      await cargar();
      setAviso({ tipo: 'ok', texto: `Rol de ${u.correo} actualizado a ${nuevo}.` });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos cambiar el rol.');
    }
  };

  const desactivar = async (u: UsuarioItem) => {
    setError(null);
    try {
      await desactivarUsuario(u.id_usuarios);
      await cargar();
      setAviso({ tipo: 'ok', texto: `${u.correo} quedó desactivado y sus sesiones fueron cerradas.` });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos desactivar al usuario.');
    }
  };

  return (
    <Card>
      <SectionTitle
        title="Usuarios de la organización"
        description="Gestión real vía /users: invitar, cambiar rol y desactivar."
        action={
          !readonly ? (
            <Button icon="plus" onClick={() => setShowForm(!showForm)}>
              Invitar analista
            </Button>
          ) : (
            <Badge>Modo solo lectura</Badge>
          )
        }
      />
      {aviso && (
        <div className={aviso.tipo === 'ok' ? 'success-banner' : 'warning-box'}>
          <Icon name={aviso.tipo === 'ok' ? 'check' : 'alert'} />
          <div>
            <strong>{aviso.tipo === 'ok' ? 'Invitación registrada' : 'Atención'}</strong>
            <p>{aviso.texto}</p>
          </div>
        </div>
      )}
      {error && (
        <div className="error-banner">
          <span>!</span>
          <div>
            <strong>Error</strong>
            <p>{error}</p>
          </div>
        </div>
      )}
      {showForm && !readonly && (
        <div className="invite-form">
          <Input
            label="Correo corporativo"
            value={nuevoCorreo}
            onChange={setNuevoCorreo}
            hint={`${AVISO.correo} · la contraseña temporal va SOLO por correo.`}
            error={nuevoCorreo && !nuevoCorreo.includes('@') ? 'Correo no válido' : undefined}
          />
          <Button onClick={() => void invitar()} disabled={enviando || !nuevoCorreo.trim().includes('@')}>
            {enviando ? 'Enviando…' : 'Enviar invitación'}
          </Button>
          <Button variant="ghost" onClick={() => setShowForm(false)}>
            Cancelar
          </Button>
        </div>
      )}
      {usuarios === null ? (
        <p className="section-desc">Cargando usuarios…</p>
      ) : (
        <DataTable
          headers={['Correo', 'Rol', 'Estado', 'Creado', readonly ? '' : 'Acciones']}
          rows={usuarios.map((u) => {
            const esYo = u.correo === user?.correo;
            const acciones = readonly ? [] : [
              <Button
                key="rol"
                small
                variant="secondary"
                disabled={esYo}
                title={esYo ? 'No puedes cambiar tu propio rol' : 'Alternar rol'}
                onClick={() => void cambiarRol(u)}
              >
                {u.rol === 'admin_organizacion' ? 'Pasar a analista' : 'Pasar a admin'}
              </Button>,
              u.activo ? (
                <Button
                  key="des"
                  small
                  variant="ghost"
                  disabled={esYo}
                  title={esYo ? 'No puedes desactivar tu propia cuenta' : 'Desactivar cuenta'}
                  onClick={() => void desactivar(u)}
                >
                  Desactivar
                </Button>
              ) : (
                <Badge key="des" tone="neutral">Desactivado</Badge>
              ),
            ];
            return [
              <span>{u.correo}{esYo && <em> · tú</em>}</span>,
              u.rol === 'admin_organizacion' ? <Badge tone="azul">{u.rol}</Badge> : u.rol === 'admin_plataforma' ? <Badge tone="medio">{u.rol}</Badge> : <Badge>{u.rol}</Badge>,
              u.activo && u.estado === 'activo' ? <Badge tone="bajo">Activo</Badge> : u.estado === 'pendiente_2fa' ? <Badge tone="azul">Pendiente 2FA</Badge> : <Badge tone="alto">Inactivo</Badge>,
              fechaCorta(u.creado_en),
              acciones,
            ];
          })}
        />
      )}
    </Card>
  );
}

export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}
