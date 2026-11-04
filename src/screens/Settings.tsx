import { useState } from 'react';
import type { Role, Theme } from '../types';
import { usuariosIniciales } from '../data';
import type { UserRow } from '../data';
import { Badge, Button, Card, DataTable, Icon, Input, PageHeader, QrPattern, SectionTitle } from '../components/ui';
import { ApiError, cambiarContrasena } from '../api';
import { evaluarClave, MINIMO_CLAVE } from '../password';

/** Configuración: Cuenta (+ Apariencia), Seguridad y 2FA, y Usuarios (solo org_admin). */

type Tab = 'account' | 'security' | 'users';

export function Settings({
  role,
  theme,
  setTheme,
  onPasswordChanged,
}: {
  role: Role;
  theme: Theme;
  setTheme: (t: Theme) => void;
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
        {role === 'org_admin' && (
          <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
            Usuarios
          </button>
        )}
      </div>

      {tab === 'account' && <Cuenta role={role} theme={theme} setTheme={setTheme} />}
      {tab === 'security' && <Seguridad onPasswordChanged={onPasswordChanged} />}
      {tab === 'users' && role === 'org_admin' && <Usuarios />}
    </>
  );
}

function Cuenta({ role, theme, setTheme }: { role: Role; theme: Theme; setTheme: (t: Theme) => void }) {
  const [nombre, setNombre] = useState('Ana Silva');
  const [correo, setCorreo] = useState('ana.silva@acme.es');
  const [guardado, setGuardado] = useState(false);

  return (
    <>
      <div className="settings-grid">
        <Card>
          <SectionTitle title="Datos personales" description="Información asociada a tu acceso." />
          {guardado && (
            <div className="success-banner">
              <Icon name="check" />
              <div>
                <strong>Cambios guardados</strong>
                <p>Tus datos personales se actualizaron correctamente.</p>
              </div>
            </div>
          )}
          <div className="form-grid">
            <Input label="Nombre completo" value={nombre} onChange={(v) => { setNombre(v); setGuardado(false); }} />
            <Input label="Correo corporativo" value={correo} onChange={(v) => { setCorreo(v); setGuardado(false); }} />
          </div>
          <div className="form-actions">
            <Button onClick={() => setGuardado(true)}>Guardar cambios</Button>
          </div>
        </Card>
        <Card>
          <SectionTitle title="Organización" description="Datos de tu espacio de trabajo." />
          <div className="detail-list">
            {(
              [
                ['Organización', 'Acme Corporation'],
                ['ID de organización', 'org_acme_8f23'],
                ['Tu rol', role],
                ['Región de datos', 'Unión Europea'],
                ['Plan', 'Enterprise'],
              ] as const
            ).map(([k, v]) => (
              <div key={k}>
                <span>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
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
      // El backend invalida todos los tokens: se fuerza el re-login.
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
        <Input label="Contraseña actual" type="password" value={actual} onChange={setActual} />
        <Input
          label="Nueva contraseña"
          type="password"
          value={nueva}
          onChange={(v) => {
            setNueva(v);
            setError(null);
          }}
          hint={`Mínimo ${MINIMO_CLAVE} caracteres; el historial no admite las últimas 3.`}
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
        <SectionTitle title="Autenticación de dos factores" description="Obligatoria para todas las cuentas." />
        <div className="twofa-status">
          <span className="security-icon">
            <Icon name="lock" />
          </span>
          <div>
            <strong>2FA activo</strong>
            <p>Configurado con una app autenticadora el 04 feb 2025.</p>
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

function Usuarios() {
  const [usuarios, setUsuarios] = useState<UserRow[]>(usuariosIniciales);
  const [showForm, setShowForm] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoCorreo, setNuevoCorreo] = useState('');
  const [error, setError] = useState(false);

  const invitar = () => {
    const nombre = nuevoNombre.trim();
    const correo = nuevoCorreo.trim();
    if (!nombre || !correo.includes('@')) {
      setError(true);
      return;
    }
    setError(false);
    setUsuarios([
      ...usuarios,
      { nombre, correo, rol: 'analyst', ultimoAcceso: '—', estado: 'Invitado' },
    ]);
    setNuevoNombre('');
    setNuevoCorreo('');
    setShowForm(false);
  };

  return (
    <Card>
      <SectionTitle
        title="Usuarios de la organización"
        description="Solo org_admin puede invitar o cambiar roles."
        action={
          <Button icon="plus" onClick={() => setShowForm(!showForm)}>
            Invitar analyst
          </Button>
        }
      />
      {showForm && (
        <div className="invite-form">
          <Input label="Nombre" value={nuevoNombre} onChange={setNuevoNombre} error={error && !nuevoNombre.trim() ? 'Campo requerido' : undefined} />
          <Input label="Correo corporativo" value={nuevoCorreo} onChange={setNuevoCorreo} error={error && !nuevoCorreo.includes('@') ? 'Correo no válido' : undefined} />
          <Button onClick={invitar}>Enviar invitación</Button>
          <Button variant="ghost" onClick={() => setShowForm(false)}>
            Cancelar
          </Button>
        </div>
      )}
      <DataTable
        headers={['Usuario', 'Correo', 'Rol', 'Último acceso', 'Estado']}
        rows={usuarios.map((u) => [
          <strong>{u.nombre}</strong>,
          u.correo,
          u.rol === 'org_admin' ? <Badge tone="azul">org_admin</Badge> : <Badge>analyst</Badge>,
          u.ultimoAcceso,
          u.estado === 'Activo' ? <Badge tone="bajo">Activo</Badge> : <Badge tone="azul">Invitado</Badge>,
        ])}
      />
    </Card>
  );
}
