# apps/identification — Servicio de Extracción IA

Servicio serverless que analiza mensajes de texto, imágenes y videos de recolecciones de materiales reciclables y devuelve datos estructurados usando Amazon Bedrock.

**Base URL (prod):** `https://um5iwhzmob.execute-api.us-east-1.amazonaws.com/api/v1`

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js 22.x (AWS Lambda) |
| Framework | Hono |
| Build | esbuild — bundle único < 2 MB, minificado en producción |
| Modelo primario | Amazon Nova 2 Lite via AWS Bedrock |
| Modelo fallback | Amazon Nova Pro (activado si confianza es baja) |
| Storage | S3 — staging temporal de imágenes/videos |
| Infra | AWS CDK → API Gateway HTTP v2 → Lambda |

---

## Cómo funciona

### Texto

```
POST /extract/text  {message: "..."}
        │
        ▼
  Nova 2 Lite — extrae empresa, fecha, materiales, cantidades
        │
        ▼
  confidence < threshold?
        │
        ├─ no  → responde 200 con extracted
        └─ sí  → reintenta con Nova Pro
                      │
                      ├─ ok  → responde 200 con extracted
                      └─ falla → responde 422 EXTRACTION_FAILED
```

### Imagen / Video

```
1. POST /extract/presign  {mimeType}
        → devuelve {sessionId, uploadUrl}

2. PUT <uploadUrl>  (directo a S3, sin pasar por Lambda)

3. POST /extract/media  {sessionId, type, notes?}
        │
        ▼
  Paso 1 — Nova 2 Lite describe lo que ve en la imagen/video
  (two-step: descripción visual → extracción estructurada)
        │
        ▼
  Paso 2 — extrae JSON con empresa, fecha, materiales
  usando la descripción como contexto adicional
        │
        ▼
  confidence check → fallback a Nova Pro si es baja
        │
        ▼
  Lambda elimina el archivo de S3 tras cada análisis
```

El two-step para imágenes mejora significativamente la precisión en fotos de documentos parciales, notas manuscritas y fotos de materiales sin remito.

---

## API Reference

### `GET /api/v1/health`

```json
{ "status": "ok" }
```

---

### `POST /api/v1/extract/text`

**Request**
```json
{
  "message": "Empresa Verdesur entregó 50 kg de papel y 20 kg de cartón el 15/06/2026"
}
```

**Response `200`**
```json
{
  "data": {
    "sessionId": "a1b2c3d4-...",
    "inputType": "text",
    "confidence": "high",
    "extracted": {
      "company": "Verdesur",
      "date": "2026-06-15",
      "materials": [
        { "type": "papel",  "quantity": 50, "unit": "kg" },
        { "type": "cartón", "quantity": 20, "unit": "kg" }
      ],
      "notes": null
    },
    "usage": {
      "inputTokens": 398,
      "outputTokens": 81,
      "costUsd": 0.00005698,
      "modelId": "us.amazon.nova-2-lite-v1:0"
    }
  }
}
```

**Response `422`** — no se pudo extraer
```json
{
  "data": {
    "sessionId": "a1b2c3d4-...",
    "inputType": "text",
    "confidence": "low",
    "extracted": null,
    "rejectedReasons": ["no_collection_data"],
    "usage": { ... }
  }
}
```

---

### `POST /api/v1/extract/presign`

**Request**
```json
{ "mimeType": "image/jpeg" }
```

Formatos soportados: `image/jpeg` · `image/png` · `image/webp` · `video/mp4` · `video/quicktime` · `video/avi` · `video/x-matroska`

**Response `200`**
```json
{
  "data": {
    "sessionId": "f9f3b2dc-...",
    "uploadUrl": "https://s3.amazonaws.com/...",
    "expiresIn": 300
  }
}
```

> El PUT a S3 debe incluir `Content-Type: <mimeType>` o S3 rechaza con 403. No agregar headers de Authorization.

---

### `POST /api/v1/extract/media`

**Request**
```json
{
  "sessionId": "f9f3b2dc-...",
  "type": "image",
  "notes": "Empresa Verdesur, retiro del 15/06. El remito está incompleto."
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `sessionId` | string | ✅ | De `/extract/presign` |
| `type` | `"image"` \| `"video"` | ✅ | Debe coincidir con lo subido |
| `notes` | string | no | Contexto adicional. Se inyecta al prompt antes de la extracción estructurada. Útil cuando imagen/video no muestra empresa o fecha claramente. |

**Response `200` — con documento**
```json
{
  "data": {
    "sessionId": "f9f3b2dc-...",
    "inputType": "image",
    "confidence": "high",
    "extracted": {
      "company": "Recicladora del Sur S.R.L.",
      "date": "2026-06-15",
      "materials": [
        { "type": "papel",  "quantity": 80, "unit": "kg" },
        { "type": "vidrio", "quantity": 30, "unit": "kg" }
      ],
      "notes": "Sello RECIBIDO visible"
    },
    "description": "The image shows a delivery receipt...",
    "usage": { ... }
  }
}
```

**Response `200` — foto de materiales sin documento** (campos no visibles retornan `null`, nunca se inventan)
```json
{
  "data": {
    "confidence": "medium",
    "extracted": {
      "company": null,
      "date": null,
      "materials": [
        { "type": "cartón", "quantity": null, "unit": null }
      ],
      "notes": null
    },
    "description": "The image shows flattened cardboard boxes...",
    ...
  }
}
```

---

## Niveles de confianza

| Valor | Significado |
|-------|-------------|
| `"high"` | Confianza ≥ 0.75 — todos los campos clave presentes |
| `"medium"` | Confianza 0.45–0.74 — algunos campos pueden ser `null` |
| `"low"` | Confianza < 0.45 — `extracted` siempre es `null` |

Cuando Nova 2 Lite devuelve `"low"`, el servicio reintenta automáticamente con Nova Pro. Si Nova Pro también devuelve `"low"`, responde `422`.

---

## Códigos de rechazo

| Código | Cuándo aparece |
|--------|---------------|
| `no_collection_data` | El input no contiene datos de recolección |
| `low_confidence` | Confianza baja después del retry con Nova Pro |
| `not_a_collection_document` | Imagen es un documento pero no de reciclaje |
| `no_recycling_data` | Sin información reconocible de materiales |
| `poor_image_quality` | Imagen demasiado borrosa u oscura |
| `poor_video_quality` | Video muy corto, oscuro o fuera de foco |

---

## Errores HTTP

| Status | Código | Causa |
|--------|--------|-------|
| `400` | `MISSING_MESSAGE` | Falta `message` en `/extract/text` |
| `400` | `MISSING_SESSION_ID` | Falta `sessionId` en `/extract/media` |
| `400` | `MISSING_MIME_TYPE` | Falta `mimeType` en `/extract/presign` |
| `400` | `INVALID_TYPE` | `type` no es `image` ni `video` |
| `404` | `SESSION_NOT_FOUND` | Sesión expirada o archivo nunca subido |
| `415` | `UNSUPPORTED_MIME_TYPE` | Formato no soportado |
| `422` | `EXTRACTION_FAILED` | Confianza baja tras retry con Nova Pro |
| `500` | — | Error inesperado en Lambda o Bedrock |

Todos los errores siguen el envelope: `{ "error": { "code": "...", "message": "..." } }`

---

## Integración completa (TypeScript)

```typescript
const API = 'https://um5iwhzmob.execute-api.us-east-1.amazonaws.com/api/v1';

// ── Texto ────────────────────────────────────────────────────────────────────
async function extractFromText(message: string) {
  const res = await fetch(`${API}/extract/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok && res.status !== 422) throw new Error(await res.text());
  const { data } = await res.json();
  return data;
}

// ── Imagen / Video ────────────────────────────────────────────────────────────
async function extractFromFile(file: File, notes?: string) {
  const type = file.type.startsWith('video/') ? 'video' : 'image';

  // 1. Presign
  const presignRes = await fetch(`${API}/extract/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mimeType: file.type }),
  });
  const { data: presign } = await presignRes.json();

  // 2. Subir directo a S3
  await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  // 3. Extraer
  const extractRes = await fetch(`${API}/extract/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: presign.sessionId,
      type,
      ...(notes?.trim() ? { notes: notes.trim() } : {}),
    }),
  });
  if (!extractRes.ok && extractRes.status !== 422) throw new Error(await extractRes.text());
  const { data } = await extractRes.json();
  return data;
}
```

---

## Estructura del código

```
src/
├── index.ts                        # Lambda handler (entry point)
├── main.ts                         # Local dev server
├── app.ts                          # Hono app — middlewares, rutas
├── config/
│   ├── config.ts                   # Variables de entorno
│   ├── logger.ts                   # Logger estructurado
│   ├── middleware.ts               # CORS, logging, error handling
│   └── router.ts                   # Registro de módulos
├── common/
│   ├── adapters/bedrock/
│   │   ├── nova.adapter.ts         # Amazon Nova 2 Lite + Nova Pro
│   │   └── claude.adapter.ts       # Claude Haiku/Sonnet (disponible)
│   └── services/
│       ├── bedrock.service.ts      # Wrapper Bedrock Converse API
│       └── s3.service.ts           # Upload / presign / delete
└── modules/identification/
    ├── identification.controller.ts
    ├── identification.service.ts   # Lógica de extracción + two-step
    ├── identification.dto.ts       # Validación de requests
    ├── identification.types.ts     # Tipos de respuesta
    └── pricing.ts                  # Cálculo de costo por tokens
```

---

## Variables de entorno

| Variable | Descripción | Valor en prod |
|----------|-------------|---------------|
| `BEDROCK_MODEL_ID` | Modelo primario | `global.amazon.nova-2-lite-v1:0` |
| `BEDROCK_FALLBACK_MODEL_ID` | Modelo fallback | `amazon.nova-pro-v1:0` |
| `S3_COLLECTIONS_BUCKET` | Bucket para staging de media | `fundares-prod-collections` |
| `CONFIDENCE_THRESHOLD` | Umbral para activar fallback (0–1) | `0.75` |
| `CORS_ORIGINS` | Orígenes permitidos | `*` o dominio específico |
| `LOG_LEVEL` | Nivel de logs | `info` |

Variables sensibles en **AWS Secrets Manager** bajo `fundares/prod/app`.

---

## Desarrollo local

```bash
cd apps/identification
npm install
npm run dev     # servidor local en puerto 4000
npm run build   # build de desarrollo (con source maps)
npm run build:prod  # build de producción (minificado)
```

## Deploy

```bash
cd infra
npx cdk deploy FundaresStack-Prod -c environment=prod
```

Documentación de infraestructura: [`infra/README.md`](../../infra/README.md)
