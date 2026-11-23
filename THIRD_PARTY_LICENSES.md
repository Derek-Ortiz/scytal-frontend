# Licencias de terceros

Este listado identifica las dependencias directas declaradas en `package.json`. Las
licencias se obtuvieron de los metadatos de los paquetes instalados en el entorno
local; no se ha generado un inventario de licencias transitivas.

## Dependencias directas

| Dependencia | Alcance | Versión declarada | Licencia | Compatible con MIT | Observaciones |
|---|---|---:|---|---|---|
| `@zxcvbn-ts/core` | Producción | `^4.2.0` | MIT | Sí | Sin restricciones incompatibles detectadas |
| `@zxcvbn-ts/language-common` | Producción | `^4.1.3` | MIT | Sí | Sin restricciones incompatibles detectadas |
| `react` | Producción | `^19.1.0` | MIT | Sí | Sin restricciones incompatibles detectadas |
| `react-dom` | Producción | `^19.1.0` | MIT | Sí | Sin restricciones incompatibles detectadas |
| `@tailwindcss/vite` | Desarrollo | `^4.1.4` | MIT | Sí | Sin restricciones incompatibles detectadas |
| `@types/react` | Desarrollo | `^19.1.2` | MIT | Sí | Tipos de desarrollo |
| `@types/react-dom` | Desarrollo | `^19.1.2` | MIT | Sí | Tipos de desarrollo |
| `@vitejs/plugin-react` | Desarrollo | `^4.4.1` | MIT | Sí | Sin restricciones incompatibles detectadas |
| `tailwindcss` | Desarrollo | `^4.1.4` | MIT | Sí | Sin restricciones incompatibles detectadas |
| `typescript` | Desarrollo | `^5.8.3` | Apache-2.0 | Sí | Licencia permisiva compatible con MIT |
| `vite` | Desarrollo | `^6.3.5` | MIT | Sí | Sin restricciones incompatibles detectadas |

No se encontraron dependencias directas con licencia GPL, AGPL o SSPL. No se tomó
ninguna decisión sobre licencias dudosas: no se encontró una licencia dudosa entre
las dependencias directas.

## Otros activos de terceros

El archivo `src/index.css` carga la fuente Inter desde Google Fonts mediante una
URL externa. Inter usa habitualmente la licencia SIL Open Font License 1.1. Esta
licencia es compatible con la distribución bajo MIT, pero el repositorio no incluye
ahora el archivo binario ni un aviso de licencia local. Se recomienda confirmar el
texto legal del paquete o descarga concreto antes de publicar y conservarlo si la
fuente pasa a distribuirse dentro del proyecto.

No se encontró un manifiesto o paquete local de la fuente en `node_modules` para
determinar en esta revisión la licencia exacta aplicada a cada archivo servido por
Google Fonts. Por tanto, no se declara con certeza como redistribuida por este
repositorio.
