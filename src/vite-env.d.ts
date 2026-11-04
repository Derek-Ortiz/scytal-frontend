/// <reference types="vite/client" />

/** Variables de entorno usadas por la aplicación. */
interface ImportMetaEnv {
  /** URL base del backend de autenticación (por defecto http://localhost:8000). */
  readonly VITE_API_URL?: string;
  /** Marca que activa el watcher por polling en el contenedor de desarrollo. */
  readonly VITE_DOCKER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
