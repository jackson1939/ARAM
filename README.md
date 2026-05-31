# Fundares — Plataforma de Gestión de Reciclaje

Monorepo Turborepo para la plataforma Fundares Santa Cruz. Automatiza la recepción, extracción con IA y validación de datos de recolección de materiales reciclables, con un panel web completo para administradores y empresas aliadas.

---

## Qué hace la plataforma

Los recolectores envían mensajes por **WhatsApp o Telegram** (texto, foto o video de remitos/materiales). Un servicio de IA extrae automáticamente empresa, fecha, materiales y cantidades. Un administrador valida la extracción y aprueba la recolección. Las empresas ven su impacto ambiental en tiempo real y descargan reportes.

```
Recolector (WhatsApp / Telegram / Web)
  │
  ├─ POST /api/webhook/whatsapp  (Twilio)
  └─ POST /api/webhook/telegram
       │
       ▼
  Guarda mensaje en DB (mensajes_recolector)
       │
       ▼
  POST /api/extraer  ──►  Servicio de Identificación IA
       │                  (Amazon Nova 2 Lite via Bedrock)
       │                  extrae: empresa / fecha / materiales / cantidades
       ▼
  Extracción en DB (estado: "pendiente")
       │
       ▼
  Admin valida en /admin/validacion
  (aprueba / edita / rechaza)
       │
       ▼
  Recolección validada en DB (recolecciones)
       │
       ▼
  Métricas visibles en dashboards
  Reportes PDF + Excel descargables
```

---

## Estructura del repositorio

```
fundares/
├── apps/
│   ├── identification/   # Servicio de extracción IA — Lambda serverless (Bedrock)
│   ├── web/              # Dashboard Next.js — roles admin y empresa
│   └── fundares/         # App Next.js alternativa (Supabase Auth)
├── packages/
│   ├── db/               # Drizzle ORM + schema compartido (Neon Postgres)
│   ├── auth/             # NextAuth config compartida
│   └── shared-types/     # Tipos TypeScript compartidos
├── infra/                # AWS CDK — recursos cloud (Lambda, API GW, S3)
├── db/                   # Migrations SQL y schema de referencia
├── docs/                 # Documentación técnica y guías de integración
└── scripts/              # Seed de datos iniciales
```

---

## Apps

### `apps/identification` — Servicio de extracción IA
**Stack:** TypeScript · Node.js 22 · Hono · AWS Lambda · Amazon Bedrock

Núcleo de IA del sistema. Recibe texto, imágenes o videos y devuelve datos de recolección estructurados (empresa, fecha, materiales, cantidades, nivel de confianza).

**Modelos:**
- **Primario:** Amazon Nova 2 Lite — texto, imágenes y video via S3
- **Fallback:** Amazon Nova Pro — se activa automáticamente cuando la confianza es baja

**Endpoints:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/extract/text` | Extrae datos de un mensaje de texto |
| `POST` | `/api/v1/extract/presign` | URL prefirmada para subir archivo a S3 |
| `POST` | `/api/v1/extract/media` | Extrae datos de imagen o video subido |
| `GET`  | `/api/v1/health` | Health check |

**Documentación completa:** [`docs/(en)/project/apps/indentification/api-reference.md`](docs/(en)/project/apps/indentification/api-reference.md)

---

### `apps/web` — Dashboard principal
**Stack:** Next.js 14 · TypeScript · Drizzle ORM · NextAuth · Neon Postgres · Tailwind CSS · Vercel Blob

Panel web con dos roles diferenciados por middleware y layout.

#### Rutas Admin (`/admin/*`)

| Ruta | Descripción |
|------|-------------|
| `/admin/dashboard` | Métricas globales: kg reciclados, CO₂ evitado, agua ahorrada, canales activos |
| `/admin/validacion` | Cola de extracciones pendientes — aprobar / editar / rechazar con calendario |
| `/admin/empresas` | Alta de empresas aliadas y gestión de credenciales de acceso |
| `/admin/reportes` | Reportes por empresa o globales — descarga PDF y Excel con filtros de fecha |
| `/admin/monitoreo` | Actividad en tiempo real por canal (Telegram, WhatsApp, Web) |
| `/admin/educacion` | Guías interactivas y contenido educativo |
| `/admin/demostracion` | Tour visual del sistema completo |

#### Rutas Empresa (`/empresa/*`)

| Ruta | Descripción |
|------|-------------|
| `/empresa/dashboard` | Impacto ambiental propio — gráficos mensual y por material |
| `/empresa/reportes` | Descarga reporte propio PDF y Excel con filtros de fecha |
| `/empresa/educacion` | Guías interactivas y contenido educativo |
| `/empresa/demostracion` | Tour visual del panel de empresa |

#### APIs internas (`/api/*`)

| Ruta | Rol | Descripción |
|------|-----|-------------|
| `GET /api/metricas` | ambos | Métricas de impacto filtradas por empresa y fecha |
| `GET /api/extracciones` | admin | Lista extracciones pendientes/aprobadas/rechazadas |
| `POST /api/extracciones` | ambos | Crea una extracción (empresa solo para la propia) |
| `POST /api/extraer` | interno | Llama al servicio de IA y guarda resultado |
| `GET /api/empresas` | admin | Lista empresas con métricas |
| `GET /api/reporte` | ambos | Genera PDF — empresa propia o global (admin) |
| `GET /api/reporte-excel` | ambos | Genera Excel — empresa propia o global (admin) |
| `POST /api/validar` | admin | Aprueba o rechaza una extracción |
| `GET /api/monitoreo` | admin | Estadísticas de canales de entrada |
| `POST /api/webhook/whatsapp` | público | Webhook Twilio WhatsApp |
| `POST /api/webhook/telegram` | público | Webhook Telegram |

#### Seguridad de datos

- Las empresas solo ven sus propios datos — el filtro se aplica a nivel de DB por `session.user.empresaId`
- El middleware bloquea rutas `/admin/*` para rol empresa y viceversa
- Operaciones sensibles verifican rol adicional en la API

---

### `apps/fundares` — App alternativa
**Stack:** Next.js 14 · TypeScript · Supabase Auth · Vercel Blob

Versión paralela con autenticación vía Supabase en lugar de NextAuth. Comparte la lógica de extracción y estructura de pantallas con `apps/web`.

---

## Packages

### `packages/db` — Capa de datos
**Stack:** Drizzle ORM · Neon Postgres (serverless)

| Tabla | Descripción |
|-------|-------------|
| `empresas` | Empresas aliadas registradas |
| `perfiles` | Usuarios — rol `admin` o `empresa`, vinculados a una empresa |
| `mensajes_recolector` | Mensajes entrantes de WhatsApp/Telegram (texto + fotos/video) |
| `extracciones` | Datos extraídos por IA, pendientes de validación admin |
| `recolecciones` | Recolecciones validadas y aprobadas |
| `contenido_educativo` | Artículos, videos e infografías publicables |

### `packages/auth`
NextAuth config compartida. Maneja sesiones, roles (`admin` / `empresa`) y redirecciones automáticas por rol.

### `packages/shared-types`
Tipos TypeScript de dominio usados por múltiples apps.

---

## Infraestructura (`infra/`)
**Stack:** AWS CDK v2 · TypeScript · us-east-1

| Recurso | Descripción |
|---------|-------------|
| API Gateway HTTP v2 | Entrada pública → Lambda |
| Lambda `fundares-prod-function` | Corre `apps/identification`, Node.js 22, 512 MB, timeout 10s |
| S3 `fundares-prod-collections` | Staging temporal de imágenes/videos (lifecycle 2 días) |
| Secrets Manager `fundares/prod/app` | `CORS_ORIGINS`, `LOG_LEVEL` |
| IAM role | Permisos Bedrock (Nova 2 Lite, Nova Pro, Claude Haiku/Sonnet) + S3 |
| CloudWatch | Logs con retención de 7 días |

**Documentación completa:** [`infra/README.md`](infra/README.md)

---

## Canales de entrada

| Canal | Mecanismo | Estado |
|-------|-----------|--------|
| WhatsApp | Twilio webhook `POST /api/webhook/whatsapp` | Activo |
| Telegram | Bot webhook `POST /api/webhook/telegram` | Activo |
| Web | Formulario en dashboard (texto, imagen, video) | Activo |

---

## Inicio rápido

### Prerrequisitos
- Node.js ≥ 18
- npm ≥ 11
- Base de datos Neon Postgres (o Postgres compatible)

### Instalación

```bash
# Clonar e instalar todas las dependencias del monorepo
git clone https://github.com/jackson1939/innovaHack-fundares
cd innovaHack-fundares
npm install
```

### Variables de entorno

Crear los siguientes archivos antes de correr las apps:

**`apps/web/.env.local`**
```env
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
WEBHOOK_SECRET=...
ANTHROPIC_API_KEY=...           # opcional, para features de IA en el web
NEXT_PUBLIC_IDENTIFICATION_API=https://...execute-api.us-east-1.amazonaws.com/api/v1
```

**`apps/identification/.env`**
```env
S3_COLLECTIONS_BUCKET=fundares-prod-collections
BEDROCK_MODEL_ID=global.amazon.nova-2-lite-v1:0
BEDROCK_FALLBACK_MODEL_ID=amazon.nova-pro-v1:0
CONFIDENCE_THRESHOLD=0.75
CORS_ORIGINS=*
LOG_LEVEL=info
```

### Correr en desarrollo

```bash
# Dashboard web (Next.js, puerto 3000)
npm run dev:web

# Servicio de identificación (Lambda local, puerto 4000)
npm run dev:identification

# Ambos en paralelo (Turborepo)
npm run dev
```

### Seed inicial (crear usuario admin)

```bash
npm run seed:admin
```

---

## Deploy

### Servicio de identificación (AWS Lambda)

```bash
# 1. Bootstrap CDK — una vez por cuenta/región
npx cdk bootstrap aws://ACCOUNT_ID/us-east-1

# 2. Crear secret — antes del primer deploy
aws secretsmanager create-secret \
  --name fundares/prod/app \
  --secret-string '{"CORS_ORIGINS":"*","LOG_LEVEL":"info"}'

# 3. Deploy
cd infra
npx cdk deploy FundaresStack-Prod -c environment=prod
```

### Dashboard web

Deployado en **Vercel** — conectar el repo y configurar las variables de entorno del panel de Vercel. El build command es `turbo run build --filter=web`.

---

## Tech stack

| Capa | Tecnología |
|------|-----------|
| Extracción IA | AWS Bedrock — Amazon Nova 2 Lite (texto + imagen + video) con fallback Nova Pro |
| API serverless | Hono · Node.js 22 · TypeScript · esbuild |
| Dashboard | Next.js 14 · Tailwind CSS · Recharts · Drizzle ORM |
| Reportes | @react-pdf/renderer (PDF) · SheetJS xlsx (Excel) |
| Tours interactivos | intro.js |
| Base de datos | Neon Postgres (serverless) |
| Mensajería | Twilio (WhatsApp) · Telegram Bot API |
| Storage | S3 (media temporal) · Vercel Blob (fotos permanentes) |
| Auth | NextAuth.js — sesiones JWT, roles admin/empresa |
| Infra | AWS CDK v2 · API Gateway HTTP v2 · Lambda · Secrets Manager |
| Monorepo | Turborepo · npm workspaces |

---

## Convenciones de commits

El proyecto usa `ARR x.y.z` como formato de versión en los commits, reflejando el número de build acumulado.
