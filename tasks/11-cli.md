# Task 11: CLI (npx facturin)

## Objetivo
Crear CLI interactivo para instalar y administrar instancias Facturin.

## Entregables
- [ ] Comando `npx facturin init`
- [ ] Comando `npx facturin start`
- [ ] Comando `npx facturin config`
- [ ] Comando `npx facturin migrate`
- [ ] Comando `npx facturin logs`
- [ ] Comando `npx facturin backup`
- [ ] Plantillas Docker generadas

## Estructura
```
packages/cli/
├── src/
│   ├── index.ts              # Entry point CLI
│   ├── commands/
│   │   ├── init.ts           # Inicializar proyecto
│   │   ├── start.ts          # Iniciar servicios
│   │   ├── config.ts         # Configurar variables
│   │   ├── migrate.ts        # Ejecutar migraciones
│   │   ├── logs.ts           # Ver logs
│   │   ├── backup.ts         # Crear backup
│   │   └── update.ts         # Actualizar versión
│   ├── templates/
│   │   ├── docker-compose.ts # Template docker-compose
│   │   ├── env.ts            # Template .env
│   │   └── nginx.ts          # Template nginx (opcional)
│   └── utils/
│       ├── prompts.ts        # Helpers para prompts
│       ├── files.ts          # Manejo de archivos
│       └── docker.ts         # Comandos Docker
├── package.json
└── bin/
    └── facturin.js           # Ejecutable
```

## Comandos

### `npx facturin init [nombre]`
```typescript
// packages/cli/src/commands/init.ts

export async function init(projectName?: string) {
  intro('🚀 Bienvenido a Facturin');
  
  // Preguntar nombre si no se proporcionó
  const name = projectName || await text({
    message: '¿Nombre del proyecto?',
    placeholder: 'mi-empresa-facturin',
  });
  
  // Configuración
  const config = await group({
    database: () => select({
      message: '¿Base de datos?',
      options: [
        { value: 'postgres', label: 'PostgreSQL (Recomendado)' },
        { value: 'sqlite', label: 'SQLite (solo desarrollo)' },
      ],
    }),
    
    sunatEnv: () => select({
      message: '¿Ambiente SUNAT?',
      options: [
        { value: 'beta', label: 'Beta (pruebas)' },
        { value: 'produccion', label: 'Producción' },
      ],
    }),
    
    apiPort: () => text({
      message: '¿Puerto para API?',
      initialValue: '3000',
    }),
    
    webPort: () => text({
      message: '¿Puerto para Web?',
      initialValue: '3001',
    }),
  });
  
  // Crear estructura
  const projectPath = path.resolve(name);
  await fs.ensureDir(projectPath);
  
  // Generar archivos
  await createDockerCompose(projectPath, config);
  await createEnvFile(projectPath, config);
  await createPackageJson(projectPath, name);
  
  outro(`✅ Proyecto creado en ${projectPath}`);
  console.log(chalk.cyan('\nPróximos pasos:'));
  console.log(chalk.white(`  cd ${name}`));
  console.log(chalk.white('  npx facturin start\n'));
}
```

### `npx facturin start`
```typescript
// packages/cli/src/commands/start.ts

export async function start() {
  // Verificar docker-compose.yml existe
  if (!await fs.pathExists('docker-compose.yml')) {
    console.error(chalk.red('❌ No se encontró docker-compose.yml'));
    console.log(chalk.yellow('Ejecuta primero: npx facturin init'));
    process.exit(1);
  }
  
  // Verificar .env existe
  if (!await fs.pathExists('.env')) {
    console.error(chalk.red('❌ No se encontró .env'));
    console.log(chalk.yellow('Ejecuta: npx facturin config'));
    process.exit(1);
  }
  
  const spinner = ora('Iniciando servicios...').start();
  
  try {
    // Pull imágenes
    spinner.text = 'Descargando imágenes Docker...';
    await execa('docker-compose', ['pull']);
    
    // Iniciar servicios
    spinner.text = 'Iniciando contenedores...';
    await execa('docker-compose', ['up', '-d']);
    
    // Esperar a que DB esté lista
    spinner.text = 'Esperando base de datos...';
    await waitForDatabase();
    
    // Ejecutar migraciones
    spinner.text = 'Ejecutando migraciones...';
    await execa('docker-compose', ['exec', 'api', 'bun', 'run', 'migrate']);
    
    spinner.succeed('✅ Facturin iniciado correctamente');
    
    console.log(chalk.green('\n🎉 Tu instancia está lista!\n'));
    console.log(chalk.white('📱 Frontend: ') + chalk.cyan('http://localhost:3001'));
    console.log(chalk.white('🔌 API:      ') + chalk.cyan('http://localhost:3000'));
    console.log(chalk.white('📊 Database: ') + chalk.cyan('postgresql://localhost:5432'));
    
    console.log(chalk.yellow('\nPróximos pasos:'));
    console.log(chalk.white('  1. Abre http://localhost:3001'));
    console.log(chalk.white('  2. Crea tu cuenta de administrador'));
    console.log(chalk.white('  3. Configura tu RUC y certificado digital'));
    console.log(chalk.white('  4. Completa la homologación SUNAT\n'));
    
  } catch (error) {
    spinner.fail('❌ Error al iniciar');
    console.error(error);
    process.exit(1);
  }
}
```

### `npx facturin config`
```typescript
// packages/cli/src/commands/config.ts

export async function config() {
  intro('⚙️  Configuración de Facturin');
  
  // Leer .env actual si existe
  const currentEnv = await readEnvFile();
  
  const updates = await group({
    databaseUrl: () => text({
      message: 'URL de la base de datos',
      initialValue: currentEnv.DATABASE_URL || 'postgresql://facturin:password@db:5432/facturin',
    }),
    
    sunatAmbiente: () => select({
      message: 'Ambiente SUNAT',
      options: [
        { value: 'beta', label: 'Beta' },
        { value: 'produccion', label: 'Producción' },
      ],
      initialValue: currentEnv.SUNAT_AMBIENTE || 'beta',
    }),
    
    apiPort: () => text({
      message: 'Puerto API',
      initialValue: currentEnv.API_PORT || '3000',
    }),
    
    webPort: () => text({
      message: 'Puerto Web',
      initialValue: currentEnv.WEB_PORT || '3001',
    }),
    
    jwtSecret: () => text({
      message: 'JWT Secret (dejar en blanco para generar)',
      initialValue: currentEnv.JWT_SECRET || generateSecret(),
    }),
  });
  
  // Escribir .env
  await writeEnvFile(updates);
  
  outro('✅ Configuración guardada');
}
```

### `npx facturin migrate`
```typescript
// packages/cli/src/commands/migrate.ts

export async function migrate() {
  const spinner = ora('Ejecutando migraciones...').start();
  
  try {
    await execa('docker-compose', ['exec', 'api', 'bun', 'run', 'db:migrate']);
    spinner.succeed('✅ Migraciones completadas');
  } catch (error) {
    spinner.fail('❌ Error en migraciones');
    console.error(error);
  }
}
```

### `npx facturin logs [servicio]`
```typescript
// packages/cli/src/commands/logs.ts

export async function logs(service?: string) {
  const args = ['logs', '-f'];
  if (service) args.push(service);
  
  const subprocess = execa('docker-compose', args, { stdio: 'inherit' });
  await subprocess;
}
```

### `npx facturin backup`
```typescript
// packages/cli/src/commands/backup.ts

export async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-${timestamp}.sql`;
  
  const spinner = ora(`Creando backup: ${filename}...`).start();
  
  try {
    // Backup DB
    await execa('docker-compose', [
      'exec', 'db',
      'pg_dump', '-U', 'facturin', 'facturin',
      '-f', `/backups/${filename}`,
    ]);
    
    // Backup uploads
    await execa('docker-compose', [
      'exec', 'api',
      'tar', '-czf', `/backups/uploads-${timestamp}.tar.gz`, '/app/uploads',
    ]);
    
    spinner.succeed(`✅ Backup creado: backups/${filename}`);
  } catch (error) {
    spinner.fail('❌ Error creando backup');
    console.error(error);
  }
}
```

## Plantillas Generadas

### docker-compose.yml
```typescript
// packages/cli/src/templates/docker-compose.ts

export function generateDockerCompose(config: Config) {
  return `
version: '3.8'

services:
  api:
    image: facturin/api:latest
    ports:
      - "${config.apiPort}:3000"
    environment:
      - DATABASE_URL=\${DATABASE_URL}
      - JWT_SECRET=\${JWT_SECRET}
      - SUNAT_AMBIENTE=\${SUNAT_AMBIENTE}
    volumes:
      - ./uploads:/app/uploads
    depends_on:
      - db

  web:
    image: facturin/web:latest
    ports:
      - "${config.webPort}:3000"
    environment:
      - API_URL=http://api:3000
    depends_on:
      - api

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=facturin
      - POSTGRES_PASSWORD=\${DB_PASSWORD}
      - POSTGRES_DB=facturin
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"

volumes:
  postgres-data:
`;
}
```

## Criterios de Aceptación
- [ ] `npx facturin init` crea proyecto funcional
- [ ] `npx facturin start` levanta todos los servicios
- [ ] `npx facturin config` permite editar configuración
- [ ] `npx facturin migrate` ejecuta migraciones
- [ ] `npx facturin logs` muestra logs en tiempo real
- [ ] `npx facturin backup` crea backups correctamente

## Bloquea
Task 12 (Docker usa los comandos del CLI)

## Bloqueado Por
Task 1, Task 10 (opcional)

## Estimación
5-6 horas
