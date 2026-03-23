# Task 1: Project Setup & Monorepo Structure

## Objetivo
Crear la estructura base del proyecto monorepo con Bun workspaces.

## Entregables
- [ ] Estructura de carpetas definida
- [ ] `package.json` raíz con workspaces configurados
- [ ] `.gitignore` apropiado
- [ ] `README.md` inicial
- [ ] Configuración TypeScript base

## Estructura Esperada
```
facturin/
├── apps/
│   ├── api/                 # Backend Elysia
│   └── web/                 # Frontend React Router
├── packages/
│   ├── sdk/                 # SDK npm
│   └── cli/                 # CLI npx facturin
├── docker-compose.yml       # Template base
└── package.json
```

## Comandos a Implementar
```bash
# Desde root
bun install
bun run dev          # Corre api + web + cli en dev
bun run build        # Build de todo
bun run typecheck    # Type check de todo
```

## Criterios de Aceptación
- [ ] `bun install` funciona sin errores
- [ ] Workspaces resueltos correctamente
- [ ] Scripts compartidos entre paquetes
- [ ] Hot reload funciona en dev

## Bloquea
Ninguno - es el primer task

## Bloqueado Por
Ninguno

## Estimación
2-3 horas
