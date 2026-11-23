# Contribuir

## Proponer cambios

1. Crea una rama desde `main`.
2. Mantén el cambio pequeño y enfocado.
3. Describe el problema, la solución y cómo comprobar el resultado.
4. Envía un Pull Request con pruebas o verificaciones relevantes.

No incluyas `.env`, claves, certificados, datos personales ni resultados de herramientas
de análisis que contengan secretos.

## Ejecutar pruebas

Con las dependencias instaladas:

```powershell
npm install
npm run typecheck
npm run build
```

También puedes usar pnpm si está disponible:

```powershell
pnpm install
pnpm typecheck
pnpm build
```
