# Scytal · Frontend

Aplicación web **B2B SaaS** para simulaciones de phishing, análisis de riesgo humano y administración protegida. Este repositorio contiene el frontend; las pantallas operativas conservan datos de demostración y el acceso se conecta al backend de autenticación Scytal.

## Stack

- [React 19] + [TypeScript]
- [Vite]
- [Tailwind CSS v4] mediante `@tailwindcss/vite`
- Sin librerías de componentes externas · iconos SVG lineales propios
- Responsive: escritorio, tablet y móvil

---

## Ejecución con Docker (recomendado)

Requisito: [Docker Desktop] (Windows/macOS) o Docker Engine con Compose v2 integrado.

El `Dockerfile` es **multi-etapa** (`deps` → `build` → `runtime`): instala dependencias con pnpm 12 sobre `node:24-alpine`, compila la app y el resultado se sirve con **nginx** (cabeceras de seguridad, CSP, gzip y cache de assets).

### Producción · nginx en el puerto 8080

```bash
docker compose up --build
```

La primera vez tarda un poco (instala dependencias y compila). Después queda visible en **http://localhost:8080**.

```bash
docker compose up --build -d    # en segundo plano
docker compose logs -f web      # ver logs
docker compose down             # detener y limpiar contenedores
```

Puerto personalizado con la variable `SCYTAL_PORT`:

```bash
# Linux / macOS / Git Bash
SCYTAL_PORT=8081 docker compose up --build

# PowerShell
$env:SCYTAL_PORT = "8081"
docker compose up --build
```

### Desarrollo · Vite con hot-reload (HMR)

```bash
docker compose up dev --build
```

Visible en **http://localhost:5173**, con recarga instantánea: los cambios en `src/`, `public/` e `index.html` se montan como volúmenes (el watcher usa polling, necesario para volúmenes montados en Windows/macOS).

- Puerto alternativo: variable `SCYTAL_DEV_PORT` (mismo método que arriba).
- El servicio `dev` usa el perfil `dev`: no arranca con `docker compose up` a menos que lo invoques explícitamente, así que puede convivir con `web` (`web` en :8080, `dev` en :5173).
- Para detenerlo (un `docker compose down` normal no toca los servicios de perfil):

  ```bash
  docker compose down --profile dev
  ```
- Si cambian **dependencias** (`package.json` / `pnpm-lock.yaml`) o `vite.config.ts`, reconstruye:

  ```bash
  docker compose build dev
  ```

### Comandos útiles

```bash
docker compose config -q        # valida el docker-compose.yml
docker compose ps               # estado de los servicios
docker compose images           # imágenes generadas
docker compose build web        # solo recompilar el build de producción
```

---

## Ejecución manual (sin Docker)

Requisitos: **Node.js 20+** (probado en Node 24) y [pnpm](https://pnpm.io) 12 (o npm).

### Con pnpm

```bash
pnpm install     # instalar dependencias
pnpm dev         # servidor de desarrollo (http://localhost:5173)
pnpm build       # comprobación de tipos + build de producción en dist/
pnpm preview     # sirve el build de producción
pnpm typecheck   # solo comprobación de tipos (tsc --noEmit)
```

### Con npm (equivalente)

```bash
npm install
npm run dev
npm run build
npm run preview
npm run typecheck
```

> El build de producción (`dist/`) es estático: puede servirse desde cualquier hosting o carpeta estática (usa rutas relativas).

---

## Estructura

```
├── docker-compose.yml        # Servicios: web (nginx :8080) y dev (Vite HMR :5173)
├── Dockerfile                # Multi-etapa: deps → build → runtime (nginx)
├── nginx.conf                # Servidor nginx: CSP, cabeceras, cache y fallback SPA
├── .dockerignore             # Excluye node_modules, dist, borrador/, etc.
├── vite.config.ts            # Base relativa + watch por polling si VITE_DOCKER=1
├── index.html
└── src/
    ├── main.tsx              # Entrada de React
    ├── App.tsx               # Estado global local: vista, rol, tema y alertas
    ├── index.css             # Tokens visuales (variables CSS) + estilos base + tema oscuro
    ├── types.ts              # Tipos compartidos (vistas, riesgo, rol, tema)
    ├── data.ts               # Modelo de datos simulado + utilidades (exportar CSV)
    ├── components/
    │   ├── icons.tsx         # Icon SVG lineales
    │   ├── ui.tsx            # Button, Input, Select, Badge, RiskBadge, Card,
    │   │                     # DataTable, Logo, MiniLine, Bars, EmailPreview, Otp, QrPattern…
    │   └── AppShell.tsx      # Lateral fija + topbar (breadcrumb, rol, selector de vistas)
    └── screens/
        ├── Landing.tsx       # Landing pública (hero, mockup, metodología, seguridad, CTA)
        ├── Auth.tsx          # Login · Verificación TOTP · Enrolamiento obligatorio 2FA
        ├── Dashboard.tsx     # Métricas, gráficas y alertas recientes
        ├── Campaigns.tsx     # Lista con filtros, buscador y paginación reales
        ├── CampaignWizard.tsx # Wizard 4 pasos (Información · Plantilla · Canales · Confirmación)
        ├── CampaignDetail.tsx # Embudo, resultados por destinatario, finalización de campaña
        ├── Groups.tsx        # Grupos, destinatarios, importación CSV y alta de grupos
        ├── Recipient.tsx     # Perfil individual con evolución e historial
        ├── Templates.tsx     # Biblioteca de plantillas con filtros
        ├── TemplateEdit.tsx  # Editor con preview de correo y landing simulada
        ├── Alerts.tsx        # Alertas + Bitácora de auditoría (2 pestañas)
        ├── Maturity.tsx      # Índice de madurez (gauge, tendencia, ranking)
        ├── Reports.tsx       # Reportes con descarga CSV real y preview de PDF
        ├── Settings.tsx      # Cuenta (+ Apariencia), Seguridad y 2FA, Usuarios
        └── SystemStates.tsx  # Estados vacíos y de carga
```

## Comportamiento clave

- **Roles:** en la barra superior se cambia entre `org_admin` (acceso completo) y `analyst` (solo lectura; se ocultan acciones de creación, edición y administración).
- **Tema:** no hay botones de tema en la lateral ni topbar; se cambia en **Configuración → Cuenta → Apariencia** y afecta a toda la interfaz (se persiste en `localStorage`).
- **Canales de campaña:** el paso *Canales* del wizard muestra únicamente **Correo electrónico** y **Código QR**; ambos son seleccionables.
- **Flujo de acceso:** landing → login → TOTP → dashboard, con enrolamiento obligatorio de 2FA desde el login.
- **Autenticación:** el cliente usa `VITE_API_URL` (por defecto `http://localhost:8000`) para registro, login, enrolamiento/confirmación TOTP, refresh rotativo, consulta de `/auth/me`, logout y cambio de contraseña. Los tokens viven solo en memoria.
- Los filtros, búsquedas y paginación de las tablas son funcionales; los botones principales cierran sus acciones (exportar CSV real, finalizar campaña con confirmación, marcar alertas como revisadas, invitar usuarios, etc.).

## Notas

- La marca se llama **Scytal** (el logo usa wordmark minúscula como decisión de estilo).
- El borrador del diseño original vive en la carpeta `borrador/`; **no se copia dentro de la imagen Docker** (aporte de tamaño) y sirve solo como referencia.
- Tras cambiar dependencias o configuración de Vite hay que reconstruir la imagen (`docker compose build`); los cambios de código en `src/` requieren rehacer el build de `web`.
