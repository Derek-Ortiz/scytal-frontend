# syntax=docker/dockerfile:1

# ============================================================
# deps · instala las dependencias con pnpm
#        (Usado por el build de producción y por el servicio `dev`)
# ============================================================
FROM node:24-alpine AS deps
WORKDIR /app

RUN npm install --global pnpm@12.16.1

# Solo manifests y ficheros de configuración: la capa de deps
# se cachea y no se invalida al cambiar código fuente.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json vite.config.ts index.html ./

RUN pnpm install --frozen-lockfile

# ============================================================
# build · compila la aplicación de producción (dist/)
# ============================================================
FROM node:24-alpine AS build
WORKDIR /app

RUN npm install --global pnpm@12.16.1

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src

# URL base de la API que se incrusta en el bundle (src/api.ts).
# CI la pasa como https://$DOMAIN/api; el compose local como /api.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN pnpm build

# ============================================================
# runtime · nginx sirviendo el build estático
# ============================================================
FROM nginx:1.27-alpine AS runtime

# Host del backend para los proxies de nginx (plantilla ${BACKEND_HOST}).
# Por defecto el backend corre en el host: puerto 8000 (desarrollo local).
ENV BACKEND_HOST=host.docker.internal:8000

# nginx procesa /etc/nginx/templates/*.template con envsubst al arrancar
# (sustituye solo variables definidas en el entorno; $host, $uri… se conservan).
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/index.html || exit 1
