# Fundares — Pitch Técnico

Plataforma de gestión de reciclaje para la Fundación para el Reciclaje, Santa Cruz, Bolivia. Convierte mensajes desordenados de recolectores (texto, foto, video) en datos validados, métricas de impacto ambiental y reportes certificados.

---

## El problema que resuelve

Los recolectores de materiales reciclables reportan sus recolecciones por WhatsApp o Telegram: mensajes informales, fotos borrosas de remitos, videos de los materiales. Fundares procesaba eso manualmente en hojas de cálculo. El resultado: datos incompletos, errores frecuentes, sin trazabilidad ni métricas.

**Fundares automatiza ese ciclo completo**: desde el mensaje crudo hasta el reporte firmado con impacto ambiental calculado.

---

## Flujo de datos

```
Recolector
  │
  ├── WhatsApp  ──► POST /api/webhook/whatsapp  (Twilio)
  ├── Telegram  ──► POST /api/webhook/telegram
  └── Web       ──► formulario en dashboard
                         │
                         ▼
              Guarda mensaje en DB
              (mensajes_recolector)
                         │
                         ▼
              POST /api/extraer
                         │
                         ▼
         ┌───────────────────────────────┐
         │  Servicio de Identificación   │
         │  AWS Lambda + Amazon Bedrock  │
         │                               │
         │  Texto ──► Nova 2 Lite        │
         │  Imagen ──► two-step          │
         │  Video  ──► S3 URI → Nova     │
         │                               │
         │  Confianza baja → Nova Pro    │
         └───────────────────────────────┘
                         │
                         ▼
              Extracción en DB
              (estado: pendiente)
                         │
                         ▼
         Admin valida en /admin/validacion
         (aprueba · edita · rechaza)
                         │
                         ▼
              Recolección validada
              (recolecciones)
                         │
              ┌───────────┴────────────┐
              ▼                        ▼
         Dashboards               Reportes
         tiempo real            PDF · Excel
```

---

## Servicios implementados

### Canal de entrada — 3 canales activos

| Canal | Mecanismo | Estado |
|-------|-----------|--------|
| WhatsApp | Webhook Twilio `POST /api/webhook/whatsapp` | Activo |
| Telegram | Webhook Bot `POST /api/webhook/telegram` | Activo |
| Web | Formulario en dashboard (texto, imagen, video) | Activo |

### Extracción con IA — `apps/identification`

Servicio serverless en AWS Lambda. Analiza el input y devuelve JSON estructurado con empresa, fecha, materiales, cantidades y nivel de confianza.

| Capacidad | Detalle |
|-----------|---------|
| Texto libre | Mensaje del recolector, cualquier formato |
| Imagen | JPEG, PNG, WEBP — flujo two-step: descripción visual → extracción estructurada |
| Video | MP4, MOV, AVI, MKV, WebM — máx. 2 min, vía S3 URI |
| Fallback automático | Si confianza < 0.75 → reintenta con Nova Pro |
| Campos extraídos | `company`, `date`, `materials[]`, `quantity`, `unit`, `notes` |
| Confianza | `high` ≥ 0.75 · `medium` 0.45–0.74 · `low` < 0.45 |

**Modelos Bedrock en uso:**

| Modelo | Rol | Context window |
|--------|-----|----------------|
| Amazon Nova 2 Lite (`global.amazon.nova-2-lite-v1:0`) | Primario | 1M tokens |
| Amazon Nova Pro (`amazon.nova-pro-v1:0`) | Fallback (confianza baja) | — |
| Claude Haiku 4 / Sonnet 4 | Disponibles (IAM configurado) | — |

### Dashboard web — `apps/web`

Next.js 14 App Router. Dos roles con rutas separadas por middleware.

**Panel Admin (`/admin/*`):**

| Pantalla | Descripción |
|----------|-------------|
| Dashboard | Métricas globales en tiempo real: kg, CO₂, agua, árboles equivalentes. Gráficos por material y canal. |
| Validación | Cola de extracciones pendientes con calendario mensual. Aprobación, edición y rechazo con un clic. |
| Empresas | Alta de empresas aliadas, generación de credenciales de acceso. |
| Reportes | PDF y Excel filtrados por empresa, año, mes o rango personalizado. Consolidado global. |
| Monitoreo | Estadísticas de canales: mensajes recibidos, estados de extracción, usuarios únicos, kg totales. |
| Educación | Guías interactivas (intro.js tours) y contenido educativo publicable. |

**Panel Empresa (`/empresa/*`):**

| Pantalla | Descripción |
|----------|-------------|
| Dashboard | Impacto ambiental propio. Gráficos de evolución mensual y por material. Refresco cada 30 s. |
| Reportes | Descarga PDF y Excel con filtros de fecha. Solo datos propios. |
| Nueva recolección | Formulario de extracción directo (texto, imagen, video) con flujo de revisión antes de guardar. |

### Sistema de reportes

| Formato | Contenido | Librería |
|---------|-----------|----------|
| PDF | Encabezado, 4 métricas de impacto, tabla por material, tabla por mes, tabla por empresa (global) | `@react-pdf/renderer` |
| Excel | 5 hojas: Resumen · Por Material · Por Mes · Por Empresa · Detalle completo | `SheetJS (xlsx)` |

### Seguridad y aislamiento de datos

- Las empresas solo acceden a sus propios datos — filtro aplicado a nivel de DB por `empresaId`
- El middleware bloquea `/admin/*` para rol empresa y `/empresa/*` para rol admin
- Las APIs verifican rol adicional en cada operación sensible
- Secrets en AWS Secrets Manager, nunca en variables de build

---

## Infraestructura

### Mapa de servicios

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS (us-east-1)                          │
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────────────────────┐  │
│  │  API Gateway     │    │  Lambda                          │  │
│  │  HTTP API v2     │───►│  fundares-prod-function          │  │
│  │                  │    │  Node.js 22 · 512 MB · 10 s      │  │
│  └──────────────────┘    └────────────┬─────────────────────┘  │
│                                       │                         │
│              ┌────────────────────────┼──────────────────┐     │
│              ▼                        ▼                   ▼     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐│
│  │  S3              │  │  Bedrock         │  │  Secrets       ││
│  │  collections     │  │  Nova 2 Lite     │  │  Manager       ││
│  │  lifecycle 2d    │  │  Nova Pro        │  │  fundares/prod ││
│  └──────────────────┘  └──────────────────┘  └────────────────┘│
│                                                                 │
│  CloudWatch Logs — Lambda + API GW (retención 7 días)          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐    ┌──────────────────────────────────┐
│  Vercel                 │    │  Neon Postgres (serverless)      │
│  apps/web               │───►│  6 tablas                        │
│  Next.js 14 · Edge      │    │  empresas · perfiles ·           │
│  Blob storage           │    │  mensajes_recolector ·           │
│                         │    │  extracciones · recolecciones ·  │
│                         │    │  contenido_educativo             │
└─────────────────────────┘    └──────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  Canales externos                                                │
│  Twilio (WhatsApp) · Telegram Bot API                           │
└──────────────────────────────────────────────────────────────────┘
```

### Recursos AWS detallados

| Recurso | Config | Descripción |
|---------|--------|-------------|
| API Gateway HTTP v2 | Auto-deploy · stage `$default` | Entrada pública → Lambda (AWS_PROXY, payload v2.0) |
| Lambda `fundares-prod-function` | Node.js 22 · 512 MB · timeout 10 s | Corre `apps/identification`, bundle esbuild < 2 MB |
| S3 `fundares-prod-collections` | Privado · SSL obligatorio | Staging temporal de imágenes/videos, lifecycle 2 días |
| Secrets Manager `fundares/prod/app` | Externo al CDK | `CORS_ORIGINS`, `LOG_LEVEL` en runtime |
| IAM `fundares-prod-lambda-exec-role` | Least-privilege | CloudWatch · Secrets Manager · S3 · Bedrock · Marketplace |
| CloudWatch Logs | Retención 7 días | `/aws/lambda/fundares-prod-function` + `/aws/api_gw/fundares-prod-api` |

---

## Estimación de costos

### AWS — Servicio de extracción IA

Costo medido por extracción real (dato de la API):

| Escenario | Tokens promedio | Costo por extracción |
|-----------|----------------|----------------------|
| Texto (Nova 2 Lite) | ~400 in · ~80 out | **~$0.000057** |
| Imagen two-step (Nova 2 Lite) | ~700 in · ~150 out | **~$0.000120** |
| Fallback (Nova Pro) | ~600 in · ~120 out | **~$0.0018** |

**Proyecciones mensuales — Nova 2 Lite como modelo principal:**

| Volumen mensual | Costo Bedrock | Lambda + API GW | Total estimado |
|-----------------|---------------|-----------------|----------------|
| 500 extracciones/mes | ~$0.06 | < $0.01 | **< $0.10** |
| 5.000 extracciones/mes | ~$0.60 | ~$0.10 | **~$0.70** |
| 50.000 extracciones/mes | ~$6.00 | ~$1.00 | **~$7.00** |

> S3: costo negligible — archivos se eliminan tras cada análisis, lifecycle de seguridad 2 días.  
> CloudWatch: ~$0.50/GB de logs ingestados.  
> Secrets Manager: $0.40/secret/mes + $0.05/10k llamadas.

### Vercel (Dashboard web)

| Plan | Costo | Límites relevantes |
|------|-------|-------------------|
| Hobby (actual) | **$0/mes** | 100 GB bandwidth · builds ilimitados |
| Pro (escala) | $20/mes | Sin límite de bandwidth · analytics avanzados |

### Neon Postgres (Base de datos)

| Plan | Costo | Límites relevantes |
|------|-------|-------------------|
| Free (actual) | **$0/mes** | 0.5 GB storage · 10 compute hours/mes |
| Launch (escala) | $19/mes | 10 GB storage · autoscaling |

### Twilio — WhatsApp

| Concepto | Costo |
|----------|-------|
| Número WhatsApp Business | $0/mes (sandbox en dev) |
| Mensaje entrante | $0.005/mensaje |
| Mensaje saliente | $0.005/mensaje |
| 1.000 mensajes/mes | **~$5** |

### Telegram Bot API
**Gratuito** — sin límite de mensajes, sin costo por webhook.

### Resumen de costo total

| Escenario | Mensual |
|-----------|---------|
| MVP / hackathon (< 500 extracciones) | **< $5/mes** |
| Operación real (5.000 extracciones) | **~$25/mes** |
| Escala completa (50.000 extracciones) | **~$50/mes** |

---

## CI/CD

Pipeline completo en GitHub Actions con tres workflows:

| Workflow | Trigger | Qué hace |
|----------|---------|----------|
| `cicd.yml` | Push a `main` / tags `v*` / PR | Detecta cambios → deploy infra (CDK) → deploy Lambda (zip) → health check → GitHub Release (prod) |
| `production-release.yml` | Manual desde Actions UI | Deploy one-click a producción con tag opcional |
| `rollback.yml` | Manual desde Actions UI | Rollback a cualquier tag previo con audit trail |

**Lógica de deploy inteligente:**
- Solo despliega CDK si `infra/` cambió o hay drift
- Solo actualiza Lambda si `apps/` cambió
- Concurrencia: un deploy a la vez por environment (queue, no cancel)
- Health check post-deploy: verifica `GET /api/v1/health` antes de marcar exitoso

---

## Stack tecnológico completo

| Capa | Tecnología |
|------|-----------|
| Extracción IA | AWS Bedrock — Amazon Nova 2 Lite (primario) + Nova Pro (fallback) |
| API serverless | Hono · Node.js 22 · TypeScript · esbuild |
| Dashboard | Next.js 14 · Tailwind CSS · Recharts · Drizzle ORM |
| Reportes | `@react-pdf/renderer` (PDF) · SheetJS xlsx (Excel) |
| Tours interactivos | intro.js |
| Base de datos | Neon Postgres (serverless) |
| Mensajería | Twilio (WhatsApp) · Telegram Bot API |
| Storage media | S3 (staging temporal, 2 días) · Vercel Blob (fotos permanentes) |
| Auth | NextAuth.js — sesiones JWT, roles `admin` / `empresa` |
| Infra como código | AWS CDK v2 · API Gateway HTTP v2 · Lambda · Secrets Manager |
| CI/CD | GitHub Actions — 3 workflows (deploy · release · rollback) |
| Monorepo | Turborepo · npm workspaces |

---

## Repositorio

```
fundares/
├── apps/
│   ├── identification/   # Servicio IA — Lambda (Bedrock)
│   ├── web/              # Dashboard Next.js — admin + empresa
│   └── fundares/         # App alternativa (Supabase Auth)
├── packages/
│   ├── db/               # Drizzle ORM + schema (Neon Postgres)
│   ├── auth/             # NextAuth config compartida
│   └── shared-types/     # Tipos TypeScript compartidos
├── infra/                # AWS CDK v2
├── db/                   # Migrations SQL
├── docs/                 # Documentación técnica
└── .github/workflows/    # CI/CD (cicd · production-release · rollback)
```

**Base URL producción (Identificación IA):**  
`https://um5iwhzmob.execute-api.us-east-1.amazonaws.com/api/v1`

---

*Fundación para el Reciclaje · Santa Cruz, Bolivia*
