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

RUN pnpm build

# ============================================================
# runtime · nginx sirviendo el build estático
# ============================================================
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/index.html || exit 1
