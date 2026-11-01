import type { Screen } from '../types';
import { Badge, Button, Logo, MiniLine, RiskBadge } from '../components/ui';
import { Icon } from '../components/icons';

/** Landing pública: oscura, premium y tecnológica. */

export function Landing({ setScreen }: { setScreen: (s: Screen) => void }) {
  const capabilities: Array<[string, string, string, Screen]> = [
    [
      'target',
      'Simulaciones multicanal',
      'Diseña campañas de phishing por correo y código QR con audiencias controladas y trazables.',
      'campaigns',
    ],
    [
      'chart',
      'Riesgo que se puede explicar',
      'Convierte cada interacción en indicadores claros por persona, grupo y organización.',
      'maturity',
    ],
    [
      'shield',
      'Administración protegida',
      '2FA obligatorio, roles granulares y una bitácora completa para cada cambio.',
      'settings',
    ],
  ];

  return (
    <div className="landing">
      <header className="landing-nav">
        <Logo />
        <nav aria-label="Secciones">
          <a href="#plataforma">Plataforma</a>
          <a href="#metodologia">Metodología</a>
          <a href="#seguridad">Seguridad</a>
        </nav>
        <div className="landing-nav-actions">
          <Button variant="ghost" onClick={() => setScreen('login')}>
            Iniciar sesión
          </Button>
          <Button onClick={() => setScreen('register')}>
            Crear cuenta <Icon name="arrow" size={14} />
          </Button>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="hero-copy">
            <div className="hero-pill">
              <span></span> Seguridad humana, medible y accionable
            </div>
            <h1>
              Convierte el factor humano en tu <em>primera línea de defensa.</em>
            </h1>
            <p>
              Scytal ayuda a equipos de TI y seguridad a simular ataques reales, detectar exposición y
              reducir el riesgo sin añadir complejidad operativa.
            </p>
            <div className="hero-actions">
              <Button onClick={() => setScreen('register')}>
                Crear tu organización <Icon name="arrow" size={15} />
              </Button>
              <Button variant="secondary" onClick={() => setScreen('login')}>
                Acceso de clientes
              </Button>
            </div>
            <div className="hero-proof">
              <span>
                <Icon name="check" size={14} /> Despliegue sin agentes
              </span>
              <span>
                <Icon name="check" size={14} /> Datos alojados en la UE
              </span>
              <span>
                <Icon name="check" size={14} /> Preparado para auditoría
              </span>
            </div>
          </div>

          <div className="hero-product" aria-label="Vista previa del panel de Scytal">
            <div className="product-glow"></div>
            <div className="product-window">
              <div className="product-window-bar">
                <span></span>
                <span></span>
                <span></span>
                <small>app.scytal.security</small>
              </div>
              <div className="product-layout">
                <div className="product-rail">
                  <Logo compact />
                  {['grid', 'target', 'users', 'chart', 'bell'].map((icon, i) => (
                    <span key={icon} className={i === 0 ? 'active' : ''}>
                      <Icon name={icon} size={15} />
                    </span>
                  ))}
                </div>
                <div className="product-canvas">
                  <div className="product-heading">
                    <div>
                      <small>VISIÓN GENERAL</small>
                      <strong>Buenos días, Ana</strong>
                    </div>
                    <Badge tone="bajo">Riesgo disminuyendo</Badge>
                  </div>
                  <div className="product-metrics">
                    <div>
                      <span>Índice de riesgo</span>
                      <strong>31,8</strong>
                      <small>−4,2 pts</small>
                    </div>
                    <div>
                      <span>Campañas activas</span>
                      <strong>3</strong>
                      <small>2 en curso</small>
                    </div>
                    <div>
                      <span>Alertas abiertas</span>
                      <strong>7</strong>
                      <small>+2 hoy</small>
                    </div>
                  </div>
                  <div className="product-panels">
                    <div className="product-chart">
                      <span>Tendencia de susceptibilidad</span>
                      <MiniLine />
                    </div>
                    <div className="product-risk">
                      <span>Exposición</span>
                      {(
                        [
                          ['Bajo', '42%'],
                          ['Medio', '29%'],
                          ['Alto', '19%'],
                          ['Crítico', '10%'],
                        ] as const
                      ).map(([risk, pct]) => (
                        <div key={risk}>
                          <RiskBadge risk={risk} />
                          <strong>{pct}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="floating-signal signal-top">
              <span className="signal-icon">
                <Icon name="shield" size={16} />
              </span>
              <div>
                <small>Protección de cuenta</small>
                <strong>2FA activo</strong>
              </div>
              <Badge tone="bajo">Seguro</Badge>
            </div>
            <div className="floating-signal signal-bottom">
              <span className="signal-icon alert">
                <Icon name="pulse" size={16} />
              </span>
              <div>
                <small>Última campaña</small>
                <strong>−18% exposición</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="trust-strip" aria-label="Clientes">
          <span>Diseñado para equipos que protegen</span>
          <div>
            <strong>NORTHSTAR</strong>
            <strong>ARCSTONE</strong>
            <strong>VERTEX</strong>
            <strong>OPAL SYSTEMS</strong>
            <strong>HELIOS</strong>
          </div>
        </section>

        <section className="landing-section" id="plataforma">
          <div className="landing-section-head">
            <div>
              <span className="landing-kicker">UNA SOLA PLATAFORMA</span>
              <h2>Del simulacro a la decisión, sin puntos ciegos.</h2>
            </div>
            <p>
              Una vista común para seguridad, TI y dirección. Prioriza lo importante y demuestra el
              progreso con datos consistentes.
            </p>
          </div>
          <div className="capability-grid">
            {capabilities.map(([icon, title, body, target], i) => (
              <article className="capability-card" key={title}>
                <span className={`capability-icon tone-${i}`}>
                  <Icon name={icon} />
                </span>
                <div className="capability-index">0{i + 1}</div>
                <h3>{title}</h3>
                <p>{body}</p>
                <button onClick={() => setScreen(target)}>
                  Explorar apartado <Icon name="arrow" size={13} />
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="workflow-section" id="metodologia">
          <div className="workflow-visual">
            <div className="workflow-grid"></div>
            <div className="workflow-orbit orbit-one"></div>
            <div className="workflow-orbit orbit-two"></div>
            <div className="workflow-core">
              <Logo compact />
              <span>SCYTAL ENGINE</span>
            </div>
            <div className="workflow-node node-a">
              <Icon name="users" />
              <span>Audiencias</span>
            </div>
            <div className="workflow-node node-b">
              <Icon name="target" />
              <span>Simulación</span>
            </div>
            <div className="workflow-node node-c">
              <Icon name="pulse" />
              <span>Señales</span>
            </div>
            <div className="workflow-node node-d">
              <Icon name="chart" />
              <span>Decisiones</span>
            </div>
          </div>
          <div className="workflow-copy">
            <span className="landing-kicker">METODOLOGÍA CONTINUA</span>
            <h2>Mejora seguridad con cada ciclo.</h2>
            <p>
              Scytal conecta preparación, ejecución y aprendizaje en un flujo diseñado para equipos
              exigentes.
            </p>
            <ol>
              <li>
                <span>01</span>
                <div>
                  <strong>Segmenta con contexto</strong>
                  <p>Organiza destinatarios por función, exposición y comportamiento histórico.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Simula de forma segura</strong>
                  <p>Lanza escenarios realistas sin almacenar credenciales ni interrumpir el trabajo.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Mide y reduce</strong>
                  <p>Detecta patrones, compara evolución y dirige formación a donde genera impacto.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section className="security-band" id="seguridad">
          <div>
            <span className="landing-kicker">SEGURIDAD POR DISEÑO</span>
            <h2>La plataforma de seguridad también debe estar protegida.</h2>
          </div>
          <div className="security-points">
            <span>
              <Icon name="lock" /> 2FA obligatorio
            </span>
            <span>
              <Icon name="users" /> Roles por organización
            </span>
            <span>
              <Icon name="file" /> Auditoría inmutable
            </span>
            <span>
              <Icon name="shield" /> Privacidad europea
            </span>
          </div>
        </section>

        <section className="landing-cta">
          <div className="cta-mark">
            <Icon name="layers" size={34} />
          </div>
          <span className="landing-kicker">EMPIEZA CON CLARIDAD</span>
          <h2>
            Haz visible el riesgo humano.
            <br />
            Haz medible su reducción.
          </h2>
          <p>
            Descubre cómo Scytal reúne simulación, analítica y control administrativo en una experiencia
            coherente.
          </p>
          <div>
            <Button onClick={() => setScreen('register')}>
              Crear cuenta <Icon name="arrow" size={15} />
            </Button>
            <Button variant="secondary" onClick={() => setScreen('login')}>
              Iniciar sesión
            </Button>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <Logo />
        <span>© 2026 Scytal Security</span>
        <div>
          <a href="#seguridad">Privacidad</a>
          <a href="#seguridad">Términos</a>
          <a href="#plataforma">Producto</a>
        </div>
      </footer>
    </div>
  );
}
