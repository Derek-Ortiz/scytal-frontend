import { useEffect, useState } from 'react';
import type { AlertItem, RecipientRow } from './data';
import { alertasIniciales } from './data';
import type { Role, Screen, Theme } from './types';
import { AppShell } from './components/AppShell';
import { Landing } from './screens/Landing';
import { AuthShell, type AuthMode } from './screens/Auth';
import { haySesion, limpiarSesion, onSesionExpirada, rolInterfaz, salir, type Yo } from './api';

/**
 * Scytal — raíz de la aplicación.
 * Navegación con estado local de React: vista activa, rol, tema, alertas
 * compartidas y sesión real del backend de autenticación (`/auth`).
 * Los tokens viajan solo en memoria (src/api.ts); el usuario activo
 * vive en este estado.
 */

const clavesVistasAuth: Screen[] = ['login', 'register', 'totp', 'onboarding', 'password'];

export default function App() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const v = localStorage.getItem('scytal-theme');
      return v === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [role, setRole] = useState<Role>('org_admin');
  const [alerts, setAlerts] = useState<AlertItem[]>(alertasIniciales);
  const [recipient, setRecipient] = useState<RecipientRow | null>(null);
  const [recipientGroup, setRecipientGroup] = useState('Finanzas Europa');

  // Sesión real (backend /auth): usuario autenticado + aviso entre pantallas de auth.
  const [user, setUser] = useState<Yo | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [emailPrefill, setEmailPrefill] = useState<string | null>(null);

  // El selector de tema (Configuración → Cuenta) cambia toda la interfaz.
  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
    try {
      localStorage.setItem('scytal-theme', theme);
    } catch {
      /* almacenamiento no disponible */
    }
  }, [theme]);

  // Al cambiar de vista se restablece el scroll.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  // El backend invalidó la sesión (logout global, cambio de contraseña,
  // tokens expirados): se limpia el estado y se vuelve al login.
  useEffect(() => {
    onSesionExpirada((mensaje) => {
      setUser(null);
      setRole('org_admin');
      setRecipient(null);
      setNotice(mensaje);
      setScreen('login');
    });
    return () => onSesionExpirada(null);
  }, []);

  // Guard de rutas: las vistas internas requieren sesión activa.
  useEffect(() => {
    if (screen !== 'landing' && !clavesVistasAuth.includes(screen) && !haySesion()) {
      setNotice('Inicia sesión para acceder a la plataforma.');
      setScreen('login');
    }
  }, [screen]);

  // Guard: una cuenta `pendiente_2fa` solo puede completar el enrolamiento;
  // cualquier intento de navegar a otro módulo vuelve al bloque de 2FA (contrato §4).
  useEffect(() => {
    if (user?.estado === 'pendiente_2fa' && screen !== 'landing' && !clavesVistasAuth.includes(screen)) {
      setScreen('onboarding');
    }
  }, [screen, user]);

  const irA = (s: Screen) => setScreen(s);

  const alAutenticarse = (me: Yo) => {
    setUser(me);
    setRole(rolInterfaz(me.rol));
  };

  const cerrarSesion = () => {
    void salir(); // invalida la sesión en el backend y limpia la memoria
    setUser(null);
    setRole('org_admin');
    setRecipient(null);
    setNotice('Sesión cerrada: todos los tokens quedaron invalidados.');
    setScreen('landing');
  };

  // Desde Configuración → Seguridad: el cambio de contraseña mata los tokens en servidor.
  const claveCambiada = (mensaje: string) => {
    setUser(null);
    setRole('org_admin');
    setRecipient(null);
    setNotice(mensaje);
    limpiarSesion();
    setScreen('login');
  };

  const readonly = role === 'analyst';

  if (screen === 'landing') {
    return <Landing setScreen={irA} />;
  }

  if (clavesVistasAuth.includes(screen)) {
    return (
      <AuthShell
        mode={screen as AuthMode}
        notice={notice}
        emailPrefill={emailPrefill}
        setScreen={irA}
        setNotice={setNotice}
        onAuthenticated={alAutenticarse}
        onEmailPrefill={setEmailPrefill}
      />
    );
  }

  return (
    <AppShell
      screen={screen}
      setScreen={irA}
      theme={theme}
      setTheme={setTheme}
      role={role}
      setRole={setRole}
      alerts={alerts}
      setAlerts={setAlerts}
      readonly={readonly}
      recipient={recipient}
      recipientGroup={recipientGroup}
      userEmail={user?.correo ?? null}
      onLogout={cerrarSesion}
      onPasswordChanged={claveCambiada}
      onSelectRecipient={(r, groupName) => {
        setRecipient(r);
        setRecipientGroup(groupName);
        setScreen('recipient');
      }}
    />
  );
}
