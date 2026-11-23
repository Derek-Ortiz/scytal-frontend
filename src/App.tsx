import { useEffect, useState } from 'react';
import type { AlertItem } from './data';
import type { Role, Screen, Theme } from './types';
import { AppShell } from './components/AppShell';
import { Landing } from './screens/Landing';
import { AuthShell, type AuthMode } from './screens/Auth';
import { ApiError, haySesion, limpiarSesion, listarAlertas, onSesionExpirada, rolInterfaz, salir, type Yo } from './api';


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
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [recipientGroup, setRecipientGroup] = useState('');
  const [campanaId, setCampanaId] = useState<string | null>(null);
  const [plantillaId, setPlantillaId] = useState<string | null>(null);

  const [user, setUser] = useState<Yo | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [emailPrefill, setEmailPrefill] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', theme === 'dark');
    try {
      localStorage.setItem('scytal-theme', theme);
    } catch {
    }
  }, [theme]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [screen]);

  useEffect(() => {
    onSesionExpirada((mensaje) => {
      setUser(null);
      setRole('org_admin');
      setRecipientId(null);
      setNotice(mensaje);
      setScreen('login');
    });
    return () => onSesionExpirada(null);
  }, []);

  useEffect(() => {
    if (screen !== 'landing' && !clavesVistasAuth.includes(screen) && !haySesion()) {
      setNotice('Inicia sesión para acceder a la plataforma.');
      setScreen('login');
    }
  }, [screen]);

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

  useEffect(() => {
    if (!user) {
      setAlerts([]);
      return;
    }

    let vivo = true;
    listarAlertas({ limit: 100 })
      .then((pagina) => {
        if (!vivo) return;
        setAlerts(
          pagina.items.map((alerta) => ({
            id: alerta.id_alertas,
            tipo: alerta.tipo,
            contexto: alerta.referencia_tipo
              ? `${alerta.referencia_tipo} ${alerta.referencia_id?.slice(0, 8) ?? ''}`
              : 'Sistema',
            severidad: /phishing|filtrad|critic/i.test(alerta.tipo)
              ? 'Crítico'
              : /login|acceso|bloque/i.test(alerta.tipo)
                ? 'Medio'
                : /cuenta|rol|admin/i.test(alerta.tipo)
                  ? 'Bajo'
                  : 'Alto',
            fecha: fechaAlerta(alerta.creado_en),
            estado: alerta.resuelto ? 'Resuelta' : 'Pendiente',
          })),
        );
      })
      .catch((e) => {
        if (vivo && !(e instanceof ApiError && e.status === 401)) {
          setNotice(e instanceof ApiError ? e.message : 'No pudimos cargar las alertas.');
        }
      });

    return () => {
      vivo = false;
    };
  }, [user]);

  const cerrarSesion = () => {
    void salir();
    setUser(null);
    setRole('org_admin');
    setRecipientId(null);
    setNotice('Sesión cerrada: todos los tokens quedaron invalidados.');
    setScreen('landing');
  };

  const claveCambiada = (mensaje: string) => {
    setUser(null);
    setRole('org_admin');
    setRecipientId(null);
    setNotice(mensaje);
    limpiarSesion();
    setScreen('login');
  };

  const readonly = role === 'analyst';

  const abrirDestinatario = (id: string, groupName: string) => {
    setRecipientId(id);
    setRecipientGroup(groupName);
    setScreen('recipient');
  };

  const abrirCampana = (id: string) => {
    setCampanaId(id);
    setScreen('campaign-detail');
  };

  const abrirPlantilla = (id: string | null) => {
    setPlantillaId(id);
    setScreen('template-edit');
  };

  if (screen === 'landing') {
    return <Landing setScreen={irA} />;
  }

  function fechaAlerta(iso: string): string {
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
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
      recipientId={recipientId}
      recipientGroup={recipientGroup}
      user={user}
      campanaId={campanaId}
      plantillaId={plantillaId}
      onLogout={cerrarSesion}
      onPasswordChanged={claveCambiada}
      onSelectRecipient={abrirDestinatario}
      onOpenCampaign={abrirCampana}
      onEditTemplate={abrirPlantilla}
    />
  );
}
