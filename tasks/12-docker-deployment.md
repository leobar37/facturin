# Task 12: Docker & Deployment

## Objetivo
Crear configuración Docker completa para producción y desarrollo.

## Entregables
- [ ] Dockerfile para API (multi-stage)
- [ ] Dockerfile para Web (multi-stage)
- [ ] docker-compose.yml para desarrollo
- [ ] docker-compose.prod.yml para producción
- [ ] Scripts de healthcheck
- [ ] Configuración de Nginx (opcional)
- [ ] Guía de deployment

## Dockerfile API

```dockerfile
# apps/api/Dockerfile

# Stage 1: Dependencies
FROM oven/bun:1 as deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Stage 2: Builder
FROM oven/bun:1 as builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# Stage 3: Production
FROM oven/bun:1-slim as production
WORKDIR /app

# Install PostgreSQL client for healthchecks
RUN apt-get update && apt-get install -y postgresql-client && rm -rf /var/lib/apt/lists/*

# Copy built app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/drizzle ./drizzle

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD pg_isready -h db -p 5432 || exit 1

EXPOSE 3000

CMD ["bun", "run", "start"]
```

## Dockerfile Web

```dockerfile
# apps/web/Dockerfile

# Stage 1: Dependencies
FROM oven/bun:1 as deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Stage 2: Builder
FROM oven/bun:1 as builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG API_URL
ENV API_URL=$API_URL
RUN bun run build

# Stage 3: Production (Nginx)
FROM nginx:alpine as production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Docker Compose Desarrollo

```yaml
# docker-compose.dev.yml

version: '3.8'

services:
  api:
    build:
      context: ./apps/api
      target: deps
    command: bun run dev
    volumes:
      - ./apps/api:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://facturin:password@db:5432/facturin
      - JWT_SECRET=dev-secret
    depends_on:
      - db

  web:
    build:
      context: ./apps/web
      target: deps
    command: bun run dev
    volumes:
      - ./apps/web:/app
      - /app/node_modules
    ports:
      - "3001:3000"
    environment:
      - API_URL=http://localhost:3000

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=facturin
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=facturin
    volumes:
      - postgres-dev:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  inngest:
    image: inngest/inngest:latest
    command: "inngest dev -u http://api:3000/api/inngest"
    ports:
      - "8288:8288"
    depends_on:
      - api

volumes:
  postgres-dev:
```

## Docker Compose Producción

```yaml
# docker-compose.prod.yml

version: '3.8'

services:
  api:
    image: facturin/api:${VERSION:-latest}
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - SUNAT_AMBIENTE=${SUNAT_AMBIENTE}
      - SUNAT_USERNAME=${SUNAT_USERNAME}
      - SUNAT_PASSWORD=${SUNAT_PASSWORD}
    volumes:
      - uploads:/app/uploads
      - certs:/app/certs:ro
    depends_on:
      - db
      - redis
    networks:
      - facturin-network

  web:
    image: facturin/web:${VERSION:-latest}
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    environment:
      - API_URL=http://api:3000
    depends_on:
      - api
    networks:
      - facturin-network

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - facturin-network

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis-data:/data
    networks:
      - facturin-network

  # Backup automático
  backup:
    image: postgres:16-alpine
    command: |
      sh -c '
        while true; do
          pg_dump -h db -U $$POSTGRES_USER $$POSTGRES_DB > /backups/backup-$$(date +%Y%m%d-%H%M%S).sql
          find /backups -name "*.sql" -mtime +7 -delete
          sleep 86400
        done
      '
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=${DB_NAME}
    volumes:
      - ./backups:/backups
    depends_on:
      - db
    networks:
      - facturin-network

volumes:
  postgres-data:
  redis-data:
  uploads:
  certs:

networks:
  facturin-network:
    driver: bridge
```

## Nginx Config (opcional)

```nginx
# nginx.conf

server {
    listen 80;
    server_name localhost;
    
    # Frontend
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
    
    # API Proxy
    location /api {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Healthcheck
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

## Scripts de Deploy

```bash
#!/bin/bash
# deploy.sh

VERSION=${1:-latest}

echo "🚀 Deploying Facturin v${VERSION}..."

# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Run migrations
docker-compose -f docker-compose.prod.yml run --rm api bun run migrate

# Restart services
docker-compose -f docker-compose.prod.yml up -d

echo "✅ Deploy completed!"
```

## Guía de Deployment

### VPS (DigitalOcean, AWS, etc.)

1. **Crear servidor:**
```bash
# Ubuntu 22.04 LTS
# 2GB RAM mínimo
# 20GB SSD
```

2. **Instalar Docker:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER
```

3. **Copiar archivos:**
```bash
scp docker-compose.prod.yml .env servidor:/opt/facturin/
```

4. **Iniciar:**
```bash
cd /opt/facturin
docker-compose -f docker-compose.prod.yml up -d
```

### Railway / Render / Fly.io

```yaml
# railway.yml
build:
  dockerfilePath: ./apps/api/Dockerfile
  builder: DOCKERFILE

deploy:
  startCommand: bun run start
  healthcheckPath: /health
  healthcheckTimeout: 300
  restartPolicyType: ON_FAILURE
  restartPolicyMaxRetries: 3
```

## Criterios de Aceptación
- [ ] Dockerfiles build sin errores
- [ ] docker-compose up funciona en local
- [ ] Healthchecks funcionan
- [ ] Backup automático crea archivos
- [ ] Deploy a VPS funciona
- [ ] SSL/TLS configurado (opcional)

## Bloquea
Ninguno (último task técnico)

## Bloqueado Por
Task 1, Task 11

## Estimación
4-5 horas
