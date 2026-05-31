# Arquitectura Backend — Fundares

Descripción técnica de la arquitectura del backend de la plataforma Fundares.

---

## Visión general

Fundares usa una arquitectura de dos capas:

1. **Servicio de extracción IA** (`apps/identification`) — Lambda serverless en AWS, sin estado, expuesto via API Gateway
2. **Dashboard web** (`apps/web`) — Next.js en Vercel, con APIs internas y conexión directa a Neon Postgres

Ambas capas comparten el schema de base de datos via el paquete `@fundares/db`.

---

## Flujo de datos

```
┌─────────────────────────────────────────────────────────────┐
│  Canales de entrada                                         │
│  WhatsApp (Twilio) ──┐                                      │
│  Telegram Bot ───────┼──► POST /api/webhook/*               │
│  Web (formulario) ───┘         │                            │
└─────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    Guarda mensajes_recolector
                                 │
                                 ▼
                    POST /api/extraer (interno)
                    WEBHOOK_SECRET autenticado
                                 │
                                 ▼
              ┌──────────────────────────────┐
              │  Servicio de Identificación  │
              │  (Lambda + Bedrock)          │
              │  Nova 2 Lite → JSON          │
              │  fallback: Nova Pro          │
              └──────────────────────────────┘
                                 │
                                 ▼
                    Inserta extraccion (estado: pendiente)
                                 │
                    ┌────────────┴────────────┐
                    │  Admin Dashboard        │
                    │  /admin/validacion      │
                    │  Aprueba / Rechaza      │
                    └────────────┬────────────┘
                                 │ aprobada
                                 ▼
                    Inserta recoleccion (validada)
                                 │
                    ┌────────────┴────────────────┐
                    │  Métricas disponibles        │
                    │  Reportes PDF + Excel        │
                    │  Dashboard empresa           │
                    └─────────────────────────────┘
```

---

## Base de datos

Neon Postgres (serverless). ORM: Drizzle. Package compartido: `@fundares/db`.

### Tablas principales

**`empresas`**
```
id (uuid PK) · nombre · logo_url · contacto_email · created_at
```

**`perfiles`**
```
id (uuid PK, FK → auth.users) · rol (admin|empresa) · empresa_id (FK) · nombre
```

**`mensajes_recolector`**
```
id · canal (whatsapp|telegram|web) · canal_user_id · contenido_texto
fotos_urls (text[]) · estado · recibido_at
```

**`extracciones`**
```
id · mensaje_id (FK) · empresa_id (FK) · tipo_material · cantidad_kg
fecha_recoleccion · confianza_ia · datos_raw (jsonb) · estado (pendiente|aprobado|rechazado|corregido)
corregido_por · created_at
```

**`recolecciones`**
```
id · extraccion_id (FK) · empresa_id (FK) · tipo_material · cantidad_kg
fecha_recoleccion · validado_por · validado_at
```

**`contenido_educativo`**
```
id · titulo · tipo (articulo|video|infografia) · url · contenido_md
tags (text[]) · publicado · created_at
```

---

## Servicio de extracción IA

**Stack:** Hono · Node.js 22 · AWS Lambda · Amazon Bedrock Converse API

### Modelos

| Rol | Modelo | Contexto | Trigger |
|-----|--------|---------|---------|
| Primario | Amazon Nova 2 Lite (`global.amazon.nova-2-lite-v1:0`) | 1M tokens | Siempre |
| Fallback | Amazon Nova Pro (`amazon.nova-pro-v1:0`) | — | Confianza < 0.75 |

### Estrategia two-step para imágenes/video

Para entradas visuales, el servicio hace dos llamadas al modelo en secuencia:

**Step 1 — Descripción visual**
```
Prompt: "Describe what you see in this image in detail. Focus on: 
company names, dates, quantities, materials, document numbers."
→ Response: descripción libre en inglés
```

**Step 2 — Extracción estructurada**
```
Prompt: "Given this image and description: <step1_output>
[+ notes del usuario si existen]
Extract the following fields as JSON: company, date, materials[], notes"
→ Response: JSON estructurado
```

Este enfoque mejora significativamente la precisión vs. extracción directa porque:
- El modelo establece un "contexto visual" propio antes de responder con formato
- El paso de descripción libre revela detalles que se perderían en extracción directa
- Los `notes` del usuario se inyectan entre los dos pasos, enriqueciendo el contexto

### Cálculo de confianza

El modelo retorna un campo `confidence` numérico (0.0–1.0). El servicio lo mapea a:

| Valor numérico | String | Comportamiento |
|---------------|--------|---------------|
| ≥ 0.75 | `"high"` | Retorna directamente |
| 0.45–0.74 | `"medium"` | Retorna (algunos campos pueden ser null) |
| < 0.45 | `"low"` | Reintenta con Nova Pro |

### Normalización de materiales

El modelo corrige automáticamente errores tipográficos comunes en los tipos de material (ej: `bevida → bebida`, `plastico → plástico`).

### Cálculo de costo

Cada respuesta incluye el desglose de tokens usados y costo estimado en USD via `pricing.ts`, usando los precios públicos de Bedrock por millón de tokens.

---

## Dashboard web

**Stack:** Next.js 14 App Router · Drizzle ORM · NextAuth.js

### Autenticación

NextAuth.js con estrategia credentials (email/contraseña hasheada con bcrypt). JWT contiene `{ id, rol, empresaId, name, email }`.

El middleware de Next.js aplica la segregación de rutas:
- `/admin/*` → solo `rol === 'admin'`
- `/empresa/*` → solo `rol === 'empresa'`

### Segregación de datos

Todo acceso a datos de empresa va filtrado por `session.user.empresaId` en la capa de API. Una empresa no puede acceder ni modificar datos de otra, independientemente de los parámetros de la request.

```typescript
// Patrón en todas las APIs de datos
if (session.user.rol === 'empresa') {
  where.push(eq(tabla.empresaId, session.user.empresaId!));
}
```

### Cálculo de métricas de impacto

Las métricas ambientales se calculan en `lib/metricas.ts` usando factores de conversión por tipo de material:

| Material | CO₂ (kg/kg) | Agua (L/kg) | Árboles equiv. |
|----------|------------|-------------|----------------|
| Plástico | 1.5 | 20 | 0.01 |
| Papel | 1.1 | 15 | 0.05 |
| Vidrio | 0.3 | 3 | 0.001 |
| Metal | 4.0 | 50 | 0.02 |
| Cartón | 0.9 | 12 | 0.04 |

---

## Canales de entrada

### WhatsApp (Twilio)

```
POST /api/webhook/whatsapp
  Verifica firma Twilio (X-Twilio-Signature)
  → Extrae contenido (texto + mediaUrl)
  → Guarda en mensajes_recolector
  → POST /api/extraer (interno, WEBHOOK_SECRET)
```

### Telegram

```
POST /api/webhook/telegram
  Verifica token en header
  → Extrae mensaje/foto/documento del update
  → Guarda en mensajes_recolector
  → POST /api/extraer (interno, WEBHOOK_SECRET)
```

### Web

El formulario `NuevaRecoleccionForm` en el dashboard llama directamente al servicio de identificación desde el browser, luego POST a `/api/extracciones` con el resultado.

---

## Reportes

### PDF (`lib/pdf.ts`)
Generado con `@react-pdf/renderer` en el servidor (Route Handler de Next.js).
Secciones: métricas de impacto, reciclaje por material, reciclaje por mes, reciclaje por empresa (solo global).

### Excel (`lib/excel.ts`)
Generado con `SheetJS (xlsx)` en el servidor.
Hojas: Resumen, Por Material, Por Mes, Por Empresa (solo global), Detalle.

---

## Infraestructura cloud

Ver [`infra/README.md`](../../../infra/README.md) para la documentación completa de AWS CDK.
