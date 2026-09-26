# Fundares — Plataforma de Gestión de Reciclaje

**Monorepo Turborepo que automatiza la recepción, extracción con IA y validación de datos de recolección de materiales reciclables, con dashboards en tiempo real para administradores y empresas aliadas.**

🌐 **Idioma / Language:** [Español](#español) | [English](#english)

---

<a name="español"></a>

## Español

### Índice

- [Descripción general](#descripción-general)
- [Flujo de datos](#flujo-de-datos)
- [Características principales](#características-principales)
- [Stack tecnológico](#stack-tecnológico)
- [Arquitectura y estructura del repositorio](#arquitectura-y-estructura-del-repositorio)
- [Requisitos previos](#requisitos-previos)
- [Instalación y configuración](#instalación-y-configuración)
- [Uso — correr el proyecto](#uso--correr-el-proyecto)
- [Variables de entorno](#variables-de-entorno)
- [Despliegue](#despliegue)
- [Estado del proyecto y roadmap](#estado-del-proyecto-y-roadmap)
- [Licencia](#licencia)
- [Autor y contacto](#autor-y-contacto)

---

### Descripción general

**Fundares** es la plataforma digital construida para la **Fundación para el Reciclaje, Santa Cruz (Bolivia)**. Resuelve un problema muy concreto: los recolectores de materiales reciclables reportan sus entregas por **WhatsApp o Telegram** —mensajes de texto informales, fotos borrosas de remitos, videos de los materiales— y ese flujo se procesaba manualmente en hojas de cálculo, con datos incompletos, errores frecuentes y sin trazabilidad ni métricas de impacto.

Fundares automatiza ese ciclo completo: desde el mensaje crudo del recolector hasta el reporte validado con el impacto ambiental calculado (kg reciclados, CO₂ evitado, agua ahorrada, árboles equivalentes).

**¿Para quién es?**
- **Recolectores** — envían sus reportes por el canal que ya usan (WhatsApp, Telegram o un formulario web), sin curva de aprendizaje.
- **Administradores de la fundación** — validan cada extracción antes de que cuente como oficial, gestionan empresas aliadas y generan reportes.
- **Empresas aliadas** — consultan en tiempo real su propio impacto ambiental y descargan reportes certificados (PDF/Excel) para sus propios informes de sostenibilidad.

> **Nota sobre el origen del repositorio:** el `package.json` raíz conserva el nombre histórico `decouple-services` y el `CHANGELOG.md`/`CODEOWNERS` referencian un origen previo (`walteribanez555/decouple-services`), centrado en un servicio de **verificación de identidad/edad** (`not_identity_document`, flujo de documentos, app móvil Flutter). El código actual en este repositorio (`jackson1939/aram`) fue reorientado por completo hacia el dominio de **gestión de reciclaje** descrito arriba: no hay app móvil en el árbol de trabajo actual (`apps/mobile` no existe), y el servicio de identificación ahora extrae datos de recolección, no documentos de identidad. No se encontró ninguna referencia a un repositorio `aramcl` en el código, por lo que no se puede confirmar esa relación desde aquí.

---

### Flujo de datos

```
Recolector (WhatsApp / Telegram / Web)
  │
  ├─ POST /api/webhook/whatsapp   (Twilio)
  └─ POST /api/webhook/telegram
       │
       ▼
  Guarda mensaje en DB (mensajes_recolector)
       │
       ▼
  POST /api/extraer  ──►  Servicio de Identificación IA
       │                  (Amazon Nova 2 Lite vía AWS Bedrock)
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
  Métricas visibles en dashboards en tiempo real
  Reportes PDF + Excel descargables
```

---

### Características principales

#### Canales de entrada (3 activos)
| Canal | Mecanismo |
|-------|-----------|
| WhatsApp | Webhook Twilio — `POST /api/webhook/whatsapp` |
| Telegram | Webhook de Bot — `POST /api/webhook/telegram` |
| Web | Formulario en el dashboard (texto, imagen o video) |

#### Extracción con IA (`apps/identification`)
- Servicio serverless (AWS Lambda) que analiza texto, imagen o video y devuelve JSON estructurado: empresa, fecha, materiales, cantidades y nivel de confianza.
- **Modelo primario:** Amazon Nova 2 Lite (`global.amazon.nova-2-lite-v1:0`) vía Bedrock Converse API, contexto de 1M tokens.
- **Fallback automático:** Amazon Nova Pro cuando la confianza cae por debajo de `CONFIDENCE_THRESHOLD` (0.75 por defecto).
- **Flujo two-step para imagen/video:** primero describe visualmente el contenido, luego extrae el JSON estructurado usando esa descripción como contexto — mejora notablemente la precisión en remitos parciales o fotos sin documento.
- Videos (MP4, MOV, AVI, MKV, WebM, máx. 2 min) se referencian por URI de S3, nunca en base64.
- Niveles de confianza: `high` (≥ 0.75), `medium` (0.45–0.74), `low` (< 0.45, siempre `extracted: null`).
- Rechazo explícito sin inventar datos: si un campo no es visible, se devuelve `null`, nunca un valor inferido.
- Cálculo de costo por extracción incluido en cada respuesta (`usage.costUsd`), basado en tokens reales.
- IAM ya habilitado (sin uso actual en el flujo) para modelos Claude Haiku 4 y Sonnet 4 vía Bedrock.

#### Dashboard web (`apps/web`) — dos roles diferenciados
**Panel Admin (`/admin/*`):**
- Métricas globales en tiempo real (kg reciclados, CO₂ evitado, agua ahorrada, árboles equivalentes) con gráficos por material y por canal.
- Cola de validación con calendario mensual — aprobar, editar o rechazar cada extracción con un clic.
- Alta y gestión de empresas aliadas, incluida la generación de credenciales de acceso.
- Reportes PDF y Excel filtrados por empresa, año, mes o rango de fechas, o consolidado global.
- Monitoreo de canales en tiempo real: mensajes recibidos, estados de extracción, usuarios únicos, kg totales.
- Contenido educativo y guías interactivas (tours con `intro.js`).

**Panel Empresa (`/empresa/*`):**
- Impacto ambiental propio con gráficos de evolución mensual y por material, refrescado cada 30 segundos.
- Reportes propios en PDF y Excel con filtros de fecha.
- Formulario de nueva recolección (texto, imagen o video) con paso de revisión antes de guardar.

#### Reportes
- **PDF** (`@react-pdf/renderer`): encabezado, métricas de impacto, tabla por material, tabla por mes y tabla por empresa (en el reporte global).
- **Excel** (SheetJS `xlsx`): hojas de Resumen, Por Material, Por Mes, Por Empresa y Detalle completo.

#### Seguridad y aislamiento de datos
- Cada empresa solo accede a sus propios datos — el filtro se aplica a nivel de base de datos por `session.user.empresaId`.
- El middleware de Next.js bloquea `/admin/*` para el rol `empresa` y `/empresa/*` para el rol `admin`.
- Las rutas de API sensibles verifican el rol nuevamente en el servidor (no solo en el middleware).
- Secretos productivos en AWS Secrets Manager — nunca en variables de build ni en el repositorio.

#### CI/CD
Tres workflows de GitHub Actions:
| Workflow | Disparador | Qué hace |
|----------|-----------|----------|
| `cicd.yml` | Push a `main`, tags `v*`, PR | Detecta qué cambió → deploy de infraestructura (CDK) si aplica → deploy de la Lambda → health check → GitHub Release |
| `production-release.yml` | Manual (Actions UI) | Deploy a producción con un clic, con tag opcional |
| `rollback.yml` | Manual (Actions UI) | Rollback a cualquier tag previo, con registro de auditoría |

El pipeline solo redeploya CDK si `infra/` cambió (o hay *drift*), solo actualiza la Lambda si `apps/`/`packages/` cambiaron, y serializa los despliegues por ambiente (cola, sin cancelar el anterior).

---

### Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Extracción IA | AWS Bedrock — Amazon Nova 2 Lite (primario) + Nova Pro (fallback) |
| API serverless | [Hono](https://hono.dev/) `^4.6` · Node.js 22 · TypeScript · esbuild |
| Dashboard | Next.js `14.2` (App Router) · React `18.3` · TypeScript · Tailwind CSS `3.4` |
| ORM / Base de datos | Drizzle ORM `^0.38` · Neon Postgres (serverless) |
| Auth | NextAuth.js `^4.24` (JWT, roles) en `apps/web` · Supabase Auth en `apps/fundares` |
| Reportes | `@react-pdf/renderer` (PDF) · SheetJS `xlsx` (Excel) |
| Gráficos | Recharts |
| Tours interactivos | intro.js |
| Notificaciones UI | react-hot-toast |
| Storage de media | S3 (staging temporal, 2 días) · Vercel Blob (fotos permanentes) |
| Mensajería | Twilio (WhatsApp) · Telegram Bot API |
| Infraestructura como código | AWS CDK v2 (TypeScript) · API Gateway HTTP v2 · Lambda · Secrets Manager · CloudWatch |
| Monorepo | Turborepo `^2.9` · npm workspaces (`npm@11.6.1`) |
| CI/CD | GitHub Actions (3 workflows) |
| Testing | Jest / ts-jest (`apps/identification`, `infra`) |

---

### Arquitectura y estructura del repositorio

```
aram/
├── apps/
│   ├── identification/   # Servicio de extracción IA — Lambda serverless (Hono + Bedrock)
│   ├── web/               # Dashboard Next.js principal — roles admin y empresa (NextAuth)
│   └── fundares/          # App Next.js paralela — misma lógica, auth vía Supabase, puerto 3001
├── packages/
│   ├── db/                 # Drizzle ORM + schema compartido (Neon Postgres) — @fundares/db
│   ├── auth/                # Configuración NextAuth compartida — @fundares/auth
│   └── shared-types/        # Tipos TypeScript de dominio compartidos entre apps
├── infra/                  # AWS CDK v2 — stacks, aspectos de validación, tests de infraestructura
├── db/                      # SQL de referencia: schema completo + migración de Telegram
├── docs/                    # Documentación técnica bilingüe (arquitectura, costos, integración)
├── scripts/                 # Script de seed (usuario admin inicial)
├── supabase/                # Schema SQL alternativo para el flujo con Supabase Auth
├── .github/workflows/       # CI/CD: cicd.yml, production-release.yml, rollback.yml
├── turbo.json               # Pipeline de tareas de Turborepo (build, lint, test, dev)
└── package.json             # Workspace raíz — nombre interno "decouple-services"
```

**Qué hace cada parte:**

- **`apps/identification`** — el núcleo de IA. Recibe texto/imagen/video, llama a Bedrock y devuelve datos estructurados. Se compila a un único bundle con esbuild y corre como función Lambda detrás de API Gateway. Estructura interna: `src/index.ts` (handler Lambda), `src/main.ts` (servidor local), `src/app.ts` (app Hono), `src/config/` (env, logger, middlewares, router), `src/common/adapters/bedrock/` (adaptadores Nova y Claude), `src/common/services/` (wrappers de Bedrock y S3), `src/modules/identification/` (controller, service, DTOs, tipos, cálculo de pricing).
- **`apps/web`** — el dashboard principal. App Router de Next.js con rutas separadas por rol (`/admin/*`, `/empresa/*`) y un conjunto de API routes internas para métricas, extracciones, validación, reportes y webhooks de los canales.
- **`apps/fundares`** — versión paralela del dashboard, misma lógica de negocio, pero con Supabase Auth en lugar de NextAuth y corriendo en el puerto 3001; comparte los paquetes `@fundares/db` y `@fundares/auth`.
- **`packages/db`** — define el schema de Drizzle (`schema.ts`) y exporta el cliente de conexión. Tablas principales: `users`, `empresas`, `perfiles`, `mensajes_recolector`, `extracciones`, `recolecciones`, `contenido_educativo`, además de `recolectores` y `conversaciones` (soporte de estado por canal).
- **`packages/auth`** — configuración compartida de NextAuth: sesión JWT con `{ id, rol, empresaId, name, email }` y redirecciones automáticas según rol.
- **`packages/shared-types`** — tipos de dominio (empresa, extracción, recolección, etc.) consumidos por ambas apps Next.js.
- **`infra/`** — define con AWS CDK v2 el stack de producción (`FundaresStack-Prod`) y el stack compartido (`FundaresSharedStack`): API Gateway HTTP v2, Lambda, bucket S3 con lifecycle de 2 días, Secrets Manager, rol IAM de mínimo privilegio y logs de CloudWatch con retención de 7 días. Incluye *validation aspects* propios (`SecurityValidationAspect`, `CostOptimizationAspect`) que corren en cada `cdk synth`/`deploy`.
- **`db/`** — `neon.schema.sql` (schema completo de referencia) y `telegram.migration.sql` (migración específica del canal Telegram).
- **`docs/`** — documentación técnica más profunda, ya parcialmente bilingüe (`docs/(en)/` y `docs/(es)/`): arquitectura de backend, costos de Bedrock, integración cliente/frontend, diagramas de infraestructura.
- **`scripts/seed-admin.mjs`** — crea el primer usuario administrador en la base de datos.

---

### Requisitos previos

| Herramienta | Versión mínima |
|-------------|-----------------|
| Node.js | ≥ 18 (recomendado 22, es el runtime de producción) |
| npm | ≥ 11 (`npm@11.6.1` fijado como `packageManager`) |
| Base de datos | Postgres compatible con Neon (serverless) |
| AWS CLI | v2 (solo para desplegar `apps/identification` / `infra`) |
| AWS CDK | v2 (`npm i -g aws-cdk`, solo para infraestructura) |
| Cuenta de Twilio | Solo si se usará el canal WhatsApp |
| Bot de Telegram | Solo si se usará el canal Telegram (vía [@BotFather](https://t.me/BotFather)) |

---

### Instalación y configuración

```bash
# 1. Clonar el repositorio
git clone https://github.com/jackson1939/aram.git
cd aram

# 2. Instalar todas las dependencias del monorepo (workspaces + Turborepo)
npm install
```

#### Variables de entorno

Crear los siguientes archivos antes de correr las apps (hay `.env.example` / `.env.local.example` de referencia en cada carpeta):

**`apps/web/.env.local`**
```env
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx
ANTHROPIC_API_KEY=sk-ant-your-key                 # opcional — features de IA adicionales
GOOGLE_VISION_API_KEY=your-google-vision-key      # opcional — OCR
TWILIO_ACCOUNT_SID=ACxxxx                         # opcional — canal WhatsApp
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
WEBHOOK_SECRET=your-random-secret-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
TELEGRAM_WEBHOOK_SECRET=random-secret-string
NEXT_PUBLIC_IDENTIFICATION_API=https://...execute-api.us-east-1.amazonaws.com/api/v1
ADMIN_EMAIL=admin@fundares.org                    # solo para scripts/seed-admin.mjs
ADMIN_PASSWORD=Admin123!
ADMIN_NAME=Administrador
```

**`apps/identification/.env`**
```env
NODE_ENV=development
DEBUG=false
CORS_ORIGINS=*
LOG_LEVEL=info
S3_COLLECTIONS_BUCKET=fundares-prod-collections
BEDROCK_MODEL_ID=global.amazon.nova-2-lite-v1:0
BEDROCK_FALLBACK_MODEL_ID=amazon.nova-pro-v1:0
CONFIDENCE_THRESHOLD=0.75
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app   # solo dev local con docker-compose
```

> Los valores de ejemplo aquí son ficticios. Nunca commitees credenciales reales — en producción viven en AWS Secrets Manager (`fundares/prod/app`) y en las variables de entorno del proyecto en Vercel.

#### Base de datos

```bash
# Aplicar el schema de referencia sobre una instancia Postgres/Neon vacía
psql "$DATABASE_URL" -f db/neon.schema.sql

# (opcional) migración específica del canal Telegram
psql "$DATABASE_URL" -f db/telegram.migration.sql
```

---

### Uso — correr el proyecto

```bash
# Dashboard web (Next.js, puerto 3000)
npm run dev:web

# Servicio de identificación (Lambda local vía Hono, puerto 4000)
npm run dev:identification

# Ambos en paralelo, orquestado por Turborepo
npm run dev

# Crear el primer usuario administrador
npm run seed:admin

# Build de todo el monorepo
npm run build

# Lint / chequeo de tipos en todos los workspaces
npm run lint
npm run check-types
```

La app alternativa `apps/fundares` (Supabase Auth) se corre de forma independiente:
```bash
cd apps/fundares && npm run dev   # puerto 3001
```

El servicio `apps/identification` también soporta Docker para desarrollo local con Postgres (`apps/identification/docker-compose.yml`).

---

### Variables de entorno

Ver la tabla completa arriba en [Instalación y configuración](#instalación-y-configuración). Resumen de las obligatorias por servicio:

| Servicio | Variables obligatorias |
|----------|------------------------|
| `apps/web` | `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `WEBHOOK_SECRET`, `NEXT_PUBLIC_IDENTIFICATION_API` |
| `apps/identification` | `S3_COLLECTIONS_BUCKET`, `BEDROCK_MODEL_ID`, `CORS_ORIGINS` |
| Canales opcionales | `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` (WhatsApp), `TELEGRAM_BOT_TOKEN` (Telegram) |

---

### Despliegue

**Servicio de identificación (AWS Lambda vía CDK):**
```bash
npx cdk bootstrap aws://ACCOUNT_ID/us-east-1        # una vez por cuenta/región

aws secretsmanager create-secret \
  --name fundares/prod/app \
  --secret-string '{"CORS_ORIGINS":"*","LOG_LEVEL":"info"}'   # antes del primer deploy

cd infra
npx cdk deploy FundaresSharedStack
npx cdk deploy FundaresStack-Prod -c environment=prod
```

**Dashboard web:** desplegado en **Vercel** — conectar el repositorio y configurar las variables de entorno en el panel de Vercel. Build command: `turbo run build --filter=web` (deploy automático en cada push a `main`).

**Automatizado:** el workflow `cicd.yml` ejecuta ambos despliegues en cada push a `main`, con detección de cambios (solo redeploya lo que cambió) y un *health check* post-deploy contra `GET /api/v1/health`.

---

### Estado del proyecto y roadmap

- **Madurez:** proyecto en **producción activa** (no es un prototipo) — tiene infraestructura real desplegada en AWS, pipeline de CI/CD con tres workflows, tests (Jest) en `apps/identification` e `infra`, y una API en producción documentada con URL pública.
- El historial de Git de este repositorio llegó como un único commit (`ARR 2.0.0`), es decir que se publicó como una instantánea consolidada — no refleja el historial completo de desarrollo original.
- El `CHANGELOG.md` describe una versión anterior del proyecto (`v1.0.0`) centrada en verificación de identidad/edad con app móvil Flutter; ese código ya no está presente en el árbol de trabajo actual, lo que indica un **pivot de producto** hacia la gestión de reciclaje. El `CHANGELOG` no ha sido actualizado para reflejar ese cambio.
- Existe una segunda app (`apps/fundares`) que duplica gran parte de la lógica de `apps/web` con un método de autenticación distinto (Supabase) — parece una migración en curso o una variante paralela, no confirmable con certeza solo desde el código.
- La sección `[Unreleased]` del `CHANGELOG.md` está vacía; no hay roadmap explícito documentado en el repositorio más allá de lo anterior.

---

### Licencia

Este repositorio incluye un archivo `LICENSE` con la **Licencia MIT**, con copyright a nombre de *Walter Ibanez (2026)* (heredado del repositorio de origen). Salvo que el propietario actual de `jackson1939/aram` indique lo contrario, el código se distribuye bajo esos mismos términos: uso, copia, modificación y distribución libres, sin garantía.

---

### Autor y contacto

- **Cuenta de GitHub del repositorio:** [jackson1939](https://github.com/jackson1939)
- **Repositorio:** [github.com/jackson1939/aram](https://github.com/jackson1939/aram)
- **Contacto de seguridad documentado en el repo** (heredado de `SECURITY.md`): walteribanez555@gmail.com — reportar vulnerabilidades de forma privada, nunca en un issue público.

---

<a name="english"></a>

## English

### Table of contents

- [Overview](#overview)
- [Data flow](#data-flow)
- [Key features](#key-features)
- [Tech stack](#tech-stack)
- [Architecture and repository structure](#architecture-and-repository-structure)
- [Prerequisites](#prerequisites)
- [Installation and setup](#installation-and-setup)
- [Usage — running the project](#usage--running-the-project)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [Project status and roadmap](#project-status-and-roadmap)
- [License](#license)
- [Author and contact](#author-and-contact)

---

### Overview

**Fundares** is the digital platform built for the **Fundación para el Reciclaje, Santa Cruz (Bolivia)**. It solves a very concrete problem: recyclable-material collectors report their deliveries over **WhatsApp or Telegram** — informal text messages, blurry photos of delivery slips, videos of the materials — and that flow used to be processed by hand in spreadsheets, resulting in incomplete data, frequent errors, and no traceability or impact metrics.

Fundares automates that entire cycle: from the collector's raw message to a validated report with calculated environmental impact (kg recycled, CO₂ avoided, water saved, equivalent trees).

**Who is it for?**
- **Collectors** — submit reports through the channel they already use (WhatsApp, Telegram, or a web form), with no learning curve.
- **Foundation administrators** — validate every extraction before it counts as official, manage partner companies, and generate reports.
- **Partner companies** — check their own environmental impact in real time and download certified reports (PDF/Excel) for their own sustainability disclosures.

> **Note on the repository's origin:** the root `package.json` keeps the historical name `decouple-services`, and `CHANGELOG.md`/`CODEOWNERS` reference a previous origin (`walteribanez555/decouple-services`) centered on an **identity/age-verification** service (`not_identity_document`, document flow, Flutter mobile app). The current code in this repository (`jackson1939/aram`) has been fully repurposed toward the **recycling management** domain described above: there is no mobile app in the current working tree (`apps/mobile` does not exist), and the identification service now extracts collection data instead of identity documents. No reference to an `aramcl` repository was found anywhere in the code, so that relationship cannot be confirmed from here.

---

### Data flow

```
Collector (WhatsApp / Telegram / Web)
  │
  ├─ POST /api/webhook/whatsapp   (Twilio)
  └─ POST /api/webhook/telegram
       │
       ▼
  Message saved to DB (mensajes_recolector)
       │
       ▼
  POST /api/extraer  ──►  AI Identification Service
       │                  (Amazon Nova 2 Lite via AWS Bedrock)
       │                  extracts: company / date / materials / quantities
       ▼
  Extraction saved to DB (status: "pending")
       │
       ▼
  Admin validates at /admin/validacion
  (approve / edit / reject)
       │
       ▼
  Validated collection in DB (recolecciones)
       │
       ▼
  Metrics visible on real-time dashboards
  Downloadable PDF + Excel reports
```

---

### Key features

#### Input channels (3 active)
| Channel | Mechanism |
|---------|-----------|
| WhatsApp | Twilio webhook — `POST /api/webhook/whatsapp` |
| Telegram | Bot webhook — `POST /api/webhook/telegram` |
| Web | Dashboard form (text, image or video) |

#### AI extraction (`apps/identification`)
- Serverless service (AWS Lambda) that analyzes text, image or video and returns structured JSON: company, date, materials, quantities, and confidence level.
- **Primary model:** Amazon Nova 2 Lite (`global.amazon.nova-2-lite-v1:0`) via the Bedrock Converse API, 1M-token context window.
- **Automatic fallback:** Amazon Nova Pro kicks in whenever confidence drops below `CONFIDENCE_THRESHOLD` (default 0.75).
- **Two-step flow for image/video:** first visually describes what's in the file, then extracts the structured JSON using that description as extra context — this materially improves accuracy on partial receipts or photos with no visible document.
- Videos (MP4, MOV, AVI, MKV, WebM, max. 2 min) are referenced by S3 URI, never sent as base64.
- Confidence tiers: `high` (≥ 0.75), `medium` (0.45–0.74), `low` (< 0.45, always returns `extracted: null`).
- Explicit rejection instead of hallucination: any field that isn't visible in the source is returned as `null`, never guessed.
- Per-extraction cost is computed and returned (`usage.costUsd`), based on actual token usage.
- IAM is already provisioned (though unused in the current flow) for Claude Haiku 4 and Sonnet 4 via Bedrock.

#### Web dashboard (`apps/web`) — two distinct roles
**Admin panel (`/admin/*`):**
- Real-time global metrics (kg recycled, CO₂ avoided, water saved, equivalent trees) with charts by material and by channel.
- Validation queue with a monthly calendar — approve, edit, or reject each extraction in one click.
- Onboarding and management of partner companies, including generating their access credentials.
- PDF and Excel reports filtered by company, year, month, or custom date range, or a global rollup.
- Real-time channel monitoring: messages received, extraction statuses, unique users, total kg.
- Educational content and interactive guided tours (`intro.js`).

**Company panel (`/empresa/*`):**
- Own environmental impact with monthly and per-material trend charts, refreshed every 30 seconds.
- Own PDF/Excel reports with date filters.
- New-collection form (text, image, or video) with a review step before saving.

#### Reporting
- **PDF** (`@react-pdf/renderer`): header, impact metrics, a per-material table, a per-month table, and a per-company table (in the global report).
- **Excel** (SheetJS `xlsx`): sheets for Summary, By Material, By Month, By Company, and full Detail.

#### Security and data isolation
- Each company can only access its own data — enforced at the database-query level via `session.user.empresaId`.
- Next.js middleware blocks `/admin/*` for the `empresa` role and `/empresa/*` for the `admin` role.
- Sensitive API routes re-check the role server-side (not just in the middleware).
- Production secrets live in AWS Secrets Manager — never in build variables or in the repository.

#### CI/CD
Three GitHub Actions workflows:
| Workflow | Trigger | What it does |
|----------|---------|---------------|
| `cicd.yml` | Push to `main`, `v*` tags, PR | Detects what changed → deploys infrastructure (CDK) if needed → deploys the Lambda → health check → GitHub Release |
| `production-release.yml` | Manual (Actions UI) | One-click production deploy, with an optional tag |
| `rollback.yml` | Manual (Actions UI) | Rollback to any previous tag, with an audit trail |

The pipeline only redeploys CDK when `infra/` changed (or drift is detected), only updates the Lambda when `apps/`/`packages/` changed, and serializes deploys per environment (queued, never cancelled).

---

### Tech stack

| Layer | Technology |
|-------|------------|
| AI extraction | AWS Bedrock — Amazon Nova 2 Lite (primary) + Nova Pro (fallback) |
| Serverless API | [Hono](https://hono.dev/) `^4.6` · Node.js 22 · TypeScript · esbuild |
| Dashboard | Next.js `14.2` (App Router) · React `18.3` · TypeScript · Tailwind CSS `3.4` |
| ORM / Database | Drizzle ORM `^0.38` · Neon Postgres (serverless) |
| Auth | NextAuth.js `^4.24` (JWT, roles) in `apps/web` · Supabase Auth in `apps/fundares` |
| Reporting | `@react-pdf/renderer` (PDF) · SheetJS `xlsx` (Excel) |
| Charts | Recharts |
| Interactive tours | intro.js |
| UI notifications | react-hot-toast |
| Media storage | S3 (temporary staging, 2-day lifecycle) · Vercel Blob (permanent photos) |
| Messaging | Twilio (WhatsApp) · Telegram Bot API |
| Infrastructure as code | AWS CDK v2 (TypeScript) · API Gateway HTTP v2 · Lambda · Secrets Manager · CloudWatch |
| Monorepo | Turborepo `^2.9` · npm workspaces (`npm@11.6.1`) |
| CI/CD | GitHub Actions (3 workflows) |
| Testing | Jest / ts-jest (`apps/identification`, `infra`) |

---

### Architecture and repository structure

```
aram/
├── apps/
│   ├── identification/   # AI extraction service — serverless Lambda (Hono + Bedrock)
│   ├── web/               # Main Next.js dashboard — admin and company roles (NextAuth)
│   └── fundares/          # Parallel Next.js app — same logic, Supabase auth, port 3001
├── packages/
│   ├── db/                 # Drizzle ORM + shared schema (Neon Postgres) — @fundares/db
│   ├── auth/                # Shared NextAuth configuration — @fundares/auth
│   └── shared-types/        # Shared domain TypeScript types
├── infra/                  # AWS CDK v2 — stacks, validation aspects, infra tests
├── db/                      # Reference SQL: full schema + Telegram migration
├── docs/                    # Bilingual technical documentation (architecture, costs, integration)
├── scripts/                 # Seed script (initial admin user)
├── supabase/                # Alternative SQL schema for the Supabase Auth flow
├── .github/workflows/       # CI/CD: cicd.yml, production-release.yml, rollback.yml
├── turbo.json               # Turborepo task pipeline (build, lint, test, dev)
└── package.json             # Root workspace — internal name "decouple-services"
```

**What each part does:**

- **`apps/identification`** — the AI core. Receives text/image/video, calls Bedrock, and returns structured data. Bundled into a single esbuild output and run as a Lambda function behind API Gateway. Internal layout: `src/index.ts` (Lambda handler), `src/main.ts` (local dev server), `src/app.ts` (Hono app), `src/config/` (env, logger, middlewares, router), `src/common/adapters/bedrock/` (Nova and Claude adapters), `src/common/services/` (Bedrock and S3 wrappers), `src/modules/identification/` (controller, service, DTOs, types, pricing calculation).
- **`apps/web`** — the main dashboard. Next.js App Router with routes split by role (`/admin/*`, `/empresa/*`) and a set of internal API routes for metrics, extractions, validation, reports, and channel webhooks.
- **`apps/fundares`** — a parallel version of the dashboard with the same business logic, but using Supabase Auth instead of NextAuth and running on port 3001; shares the `@fundares/db` and `@fundares/auth` packages.
- **`packages/db`** — defines the Drizzle schema (`schema.ts`) and exports the connection client. Core tables: `users`, `empresas`, `perfiles`, `mensajes_recolector`, `extracciones`, `recolecciones`, `contenido_educativo`, plus `recolectores` and `conversaciones` (per-channel state support).
- **`packages/auth`** — shared NextAuth configuration: JWT session shaped as `{ id, rol, empresaId, name, email }`, with automatic role-based redirects.
- **`packages/shared-types`** — domain types (company, extraction, collection, etc.) consumed by both Next.js apps.
- **`infra/`** — defines the production stack (`FundaresStack-Prod`) and the shared stack (`FundaresSharedStack`) with AWS CDK v2: HTTP API v2 Gateway, Lambda, an S3 bucket with a 2-day lifecycle, Secrets Manager, a least-privilege IAM role, and CloudWatch logs with 7-day retention. Includes custom validation aspects (`SecurityValidationAspect`, `CostOptimizationAspect`) that run on every `cdk synth`/`deploy`.
- **`db/`** — `neon.schema.sql` (full reference schema) and `telegram.migration.sql` (Telegram-channel-specific migration).
- **`docs/`** — deeper technical documentation, already partly bilingual (`docs/(en)/` and `docs/(es)/`): backend architecture, Bedrock costs, client/frontend integration, infrastructure diagrams.
- **`scripts/seed-admin.mjs`** — creates the first administrator user in the database.

---

### Prerequisites

| Tool | Minimum version |
|------|-------------------|
| Node.js | ≥ 18 (22 recommended — it's the production runtime) |
| npm | ≥ 11 (`npm@11.6.1` pinned as `packageManager`) |
| Database | Neon-compatible serverless Postgres |
| AWS CLI | v2 (only needed to deploy `apps/identification` / `infra`) |
| AWS CDK | v2 (`npm i -g aws-cdk`, infrastructure only) |
| Twilio account | Only if the WhatsApp channel will be used |
| Telegram bot | Only if the Telegram channel will be used (via [@BotFather](https://t.me/BotFather)) |

---

### Installation and setup

```bash
# 1. Clone the repository
git clone https://github.com/jackson1939/aram.git
cd aram

# 2. Install all monorepo dependencies (workspaces + Turborepo)
npm install
```

#### Environment variables

Create the following files before running the apps (each folder ships a reference `.env.example` / `.env.local.example`):

**`apps/web/.env.local`**
```env
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx
ANTHROPIC_API_KEY=sk-ant-your-key                 # optional — extra AI features
GOOGLE_VISION_API_KEY=your-google-vision-key      # optional — OCR
TWILIO_ACCOUNT_SID=ACxxxx                         # optional — WhatsApp channel
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
WEBHOOK_SECRET=your-random-secret-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
TELEGRAM_WEBHOOK_SECRET=random-secret-string
NEXT_PUBLIC_IDENTIFICATION_API=https://...execute-api.us-east-1.amazonaws.com/api/v1
ADMIN_EMAIL=admin@fundares.org                    # scripts/seed-admin.mjs only
ADMIN_PASSWORD=Admin123!
ADMIN_NAME=Administrador
```

**`apps/identification/.env`**
```env
NODE_ENV=development
DEBUG=false
CORS_ORIGINS=*
LOG_LEVEL=info
S3_COLLECTIONS_BUCKET=fundares-prod-collections
BEDROCK_MODEL_ID=global.amazon.nova-2-lite-v1:0
BEDROCK_FALLBACK_MODEL_ID=amazon.nova-pro-v1:0
CONFIDENCE_THRESHOLD=0.75
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app   # local dev with docker-compose only
```

> The example values above are fictitious. Never commit real credentials — in production they live in AWS Secrets Manager (`fundares/prod/app`) and in the Vercel project's environment variables.

#### Database

```bash
# Apply the reference schema to an empty Postgres/Neon instance
psql "$DATABASE_URL" -f db/neon.schema.sql

# (optional) Telegram-channel-specific migration
psql "$DATABASE_URL" -f db/telegram.migration.sql
```

---

### Usage — running the project

```bash
# Web dashboard (Next.js, port 3000)
npm run dev:web

# Identification service (local Lambda via Hono, port 4000)
npm run dev:identification

# Both in parallel, orchestrated by Turborepo
npm run dev

# Create the first admin user
npm run seed:admin

# Build the whole monorepo
npm run build

# Lint / type-check every workspace
npm run lint
npm run check-types
```

The alternative app `apps/fundares` (Supabase Auth) runs independently:
```bash
cd apps/fundares && npm run dev   # port 3001
```

`apps/identification` also supports Docker for local development with Postgres (`apps/identification/docker-compose.yml`).

---

### Environment variables

See the full table above under [Installation and setup](#installation-and-setup). Summary of what's required per service:

| Service | Required variables |
|---------|---------------------|
| `apps/web` | `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `WEBHOOK_SECRET`, `NEXT_PUBLIC_IDENTIFICATION_API` |
| `apps/identification` | `S3_COLLECTIONS_BUCKET`, `BEDROCK_MODEL_ID`, `CORS_ORIGINS` |
| Optional channels | `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` (WhatsApp), `TELEGRAM_BOT_TOKEN` (Telegram) |

---

### Deployment

**Identification service (AWS Lambda via CDK):**
```bash
npx cdk bootstrap aws://ACCOUNT_ID/us-east-1        # once per account/region

aws secretsmanager create-secret \
  --name fundares/prod/app \
  --secret-string '{"CORS_ORIGINS":"*","LOG_LEVEL":"info"}'   # before the first deploy

cd infra
npx cdk deploy FundaresSharedStack
npx cdk deploy FundaresStack-Prod -c environment=prod
```

**Web dashboard:** deployed on **Vercel** — connect the repository and set the environment variables in the Vercel dashboard. Build command: `turbo run build --filter=web` (auto-deploys on every push to `main`).

**Automated:** the `cicd.yml` workflow runs both deployments on every push to `main`, with change detection (only redeploying what changed) and a post-deploy health check against `GET /api/v1/health`.

---

### Project status and roadmap

- **Maturity:** this is an **actively deployed production project**, not a prototype — it has real AWS infrastructure, a three-workflow CI/CD pipeline, tests (Jest) in `apps/identification` and `infra`, and a documented production API with a public URL.
- This repository's Git history arrived as a single squashed commit (`ARR 2.0.0`) — it does not reflect the full original development history.
- `CHANGELOG.md` describes an earlier version (`v1.0.0`) centered on identity/age verification with a Flutter mobile app; that code is no longer present in the current working tree, indicating a **product pivot** toward recycling management. The changelog itself has not been updated to reflect that pivot.
- A second app (`apps/fundares`) duplicates much of `apps/web`'s logic with a different auth method (Supabase) — this looks like an in-progress migration or a parallel variant, though that can't be confirmed with certainty from the code alone.
- The `[Unreleased]` section of `CHANGELOG.md` is empty; there is no explicit roadmap documented in the repository beyond the above.

---

### License

This repository ships a `LICENSE` file under the **MIT License**, copyrighted to *Walter Ibanez (2026)* (inherited from the upstream repository). Unless the current owner of `jackson1939/aram` states otherwise, the code is distributed under those same terms: free use, copying, modification, and distribution, with no warranty.

---

### Author and contact

- **Repository's GitHub account:** [jackson1939](https://github.com/jackson1939)
- **Repository:** [github.com/jackson1939/aram](https://github.com/jackson1939/aram)
- **Security contact documented in the repo** (inherited from `SECURITY.md`): walteribanez555@gmail.com — report vulnerabilities privately, never in a public issue.
