# Extraction API — Request & Response Reference

Base URL: `https://um5iwhzmob.execute-api.us-east-1.amazonaws.com/api/v1`

All responses are wrapped in `{ "data": T }`.  
All errors are wrapped in `{ "error": { "code": string, "message": string } }`.

---

## GET `/health`

```json
{ "status": "ok" }
```

---

## POST `/extract/text`

Extract recycling collection data from a plain text message.

### Request

```json
{
  "message": "Empresa Verdesur entregó 80kg de cartón y 45 botellas PET el 15/06/2026"
}
```

| Field     | Type     | Required | Description              |
|-----------|----------|----------|--------------------------|
| `message` | `string` | yes      | Raw text from the collector |

### Response `200` — data extracted

```json
{
  "data": {
    "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "inputType": "text",
    "confidence": "high",
    "extracted": {
      "company": "Verdesur",
      "date": "2026-06-15",
      "materials": [
        { "type": "cartón",       "quantity": 80, "unit": "kg"   },
        { "type": "botellas PET", "quantity": 45, "unit": "unit" }
      ],
      "notes": null
    },
    "usage": {
      "inputTokens":  398,
      "outputTokens": 81,
      "costUsd":      0.00005698,
      "modelId":      "us.amazon.nova-2-lite-v1:0"
    }
  }
}
```

### Response `422` — could not extract

```json
{
  "data": {
    "sessionId":       "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "inputType":       "text",
    "confidence":      "low",
    "extracted":       null,
    "rejectedReasons": ["no_collection_data"],
    "usage": {
      "inputTokens":  210,
      "outputTokens": 18,
      "costUsd":      0.00000928,
      "modelId":      "us.amazon.nova-2-lite-v1:0"
    }
  }
}
```

---

## POST `/extract/presign`

Get a presigned S3 URL to upload a file directly from the browser.

### Request

```json
{ "mimeType": "image/png" }
```

| Field      | Type     | Required | Accepted values |
|------------|----------|----------|-----------------|
| `mimeType` | `string` | yes      | `image/jpeg` · `image/png` · `image/webp` · `video/mp4` · `video/quicktime` · `video/avi` · `video/x-matroska` |

### Response `200`

```json
{
  "data": {
    "sessionId": "f9f3b2dc-9bb4-4aa5-83b0-e277f25c6b9f",
    "uploadUrl": "https://fundares-prod-collections.s3.us-east-1.amazonaws.com/sessions/f9f3b2dc-.../media?X-Amz-...",
    "expiresIn": 300
  }
}
```

| Field       | Type     | Description |
|-------------|----------|-------------|
| `sessionId` | `string` | Pass this to `/extract/media` after uploading |
| `uploadUrl` | `string` | Presigned S3 PUT URL — valid for `expiresIn` seconds |
| `expiresIn` | `number` | Seconds until URL expires (300 = 5 minutes) |

### Upload the file (browser)

```typescript
await fetch(uploadUrl, {
  method:  'PUT',
  headers: { 'Content-Type': file.type },
  body:    file,
});
```

> Do NOT add Authorization headers or query params — S3 will reject them with 403.

---

## POST `/extract/media`

Extract recycling data from an uploaded image or video.  
Call this **after** the S3 upload returns `200`.

### Request

```json
{
  "sessionId": "f9f3b2dc-9bb4-4aa5-83b0-e277f25c6b9f",
  "type":      "image",
  "notes":     "Empresa Verdesur, retiro del 15/06/2026. El remito está incompleto."
}
```

| Field       | Type                   | Required | Description |
|-------------|------------------------|----------|-------------|
| `sessionId` | `string`               | yes      | From `/extract/presign` |
| `type`      | `"image"` \| `"video"` | yes      | Must match the uploaded file |
| `notes`     | `string`               | no       | Extra context from the user (company, date, observations). Injected into the extraction prompt between the visual description step and the structured extraction step. |

### Response `200` — document with all fields

```json
{
  "data": {
    "sessionId":  "f9f3b2dc-9bb4-4aa5-83b0-e277f25c6b9f",
    "inputType":  "image",
    "confidence": "high",
    "extracted": {
      "company": "Recicladora del Sur S.R.L.",
      "date":    "2026-06-15",
      "materials": [
        { "type": "papel",  "quantity": 80, "unit": "kg" },
        { "type": "vidrio", "quantity": 30, "unit": "kg" }
      ],
      "notes": "Sello RECIBIDO visible"
    },
    "description": "The image shows a delivery receipt from Recicladora del Sur S.R.L. dated 15/06/2026, listing 80kg of papel and 30kg of vidrio. A RECIBIDO stamp is visible at the bottom.",
    "usage": {
      "inputTokens":  1104,
      "outputTokens": 95,
      "costUsd":      0.00014816,
      "modelId":      "us.amazon.nova-2-lite-v1:0"
    }
  }
}
```

### Response `200` — photo of materials without document

Fields not visible in the image are returned as `null` — never guessed.

```json
{
  "data": {
    "sessionId":  "f9f3b2dc-9bb4-4aa5-83b0-e277f25c6b9f",
    "inputType":  "image",
    "confidence": "medium",
    "extracted": {
      "company":   null,
      "date":      null,
      "materials": [
        { "type": "cartón",       "quantity": null, "unit": null },
        { "type": "botellas PET", "quantity": null, "unit": null }
      ],
      "notes": null
    },
    "description": "The image shows flattened cardboard boxes and crushed PET bottles on a warehouse floor.",
    "usage": { ... }
  }
}
```

### Response `422` — could not extract

```json
{
  "data": {
    "sessionId":       "f9f3b2dc-9bb4-4aa5-83b0-e277f25c6b9f",
    "inputType":       "image",
    "confidence":      "low",
    "extracted":       null,
    "rejectedReasons": ["no_collection_data"],
    "description":     "The image shows a landscape photograph. No recycling materials or documents visible.",
    "usage": { ... }
  }
}
```

---

## Confidence levels

| Value      | Numeric range | Meaning |
|------------|--------------|---------|
| `"high"`   | ≥ 0.75       | All key fields found — returned directly |
| `"medium"` | 0.45–0.74    | Some fields may be `null` — returned with warning |
| `"low"`    | < 0.45       | `extracted` is always `null` — Nova Pro fallback triggered |

When Nova 2 Lite returns `"low"`, the service automatically retries with **Amazon Nova Pro**. If Nova Pro also returns `"low"`, the endpoint responds `422 EXTRACTION_FAILED`.

---

## Rejected reasons

| Code | When it appears |
|------|-----------------|
| `no_collection_data` | Input contains no recycling or collection data |
| `low_confidence` | Confidence below threshold after Nova Pro retry |
| `not_a_collection_document` | Image is a document but unrelated to recycling |
| `no_recycling_data` | No recognizable recycling material information |
| `poor_image_quality` | Image too blurry or dark to read |
| `poor_video_quality` | Video too short, dark, or out of focus |

---

## Error responses

### `400` Bad Request

```json
{
  "error": {
    "code":    "MISSING_MESSAGE",
    "message": "\"message\" is required."
  }
}
```

### `415` Unsupported Media Type

```json
{
  "error": {
    "code":    "UNSUPPORTED_MIME_TYPE",
    "message": "Unsupported mimeType \"image/gif\". Accepted: image/jpeg, image/png, image/webp, video/mp4, ..."
  }
}
```

### `500` Internal Server Error

```json
{
  "error": {
    "code":    "INTERNAL_ERROR",
    "message": "An unexpected error occurred."
  }
}
```

| Status | Code | Cause |
|--------|------|-------|
| `400` | `MISSING_MESSAGE` | `message` not in `/extract/text` |
| `400` | `MISSING_SESSION_ID` | `sessionId` not in `/extract/media` |
| `400` | `MISSING_MIME_TYPE` | `mimeType` not in `/extract/presign` |
| `400` | `INVALID_TYPE` | `type` not `image` or `video` |
| `404` | `SESSION_NOT_FOUND` | Session expired or media never uploaded |
| `415` | `UNSUPPORTED_MIME_TYPE` | Format not supported |
| `422` | `EXTRACTION_FAILED` | Low confidence after Nova Pro retry |
| `500` | — | Unexpected Lambda or Bedrock error |

---

## Complete flow (TypeScript)

```typescript
const API = 'https://um5iwhzmob.execute-api.us-east-1.amazonaws.com/api/v1';

// ── Text ──────────────────────────────────────────────────────────────────────
async function extractFromText(message: string) {
  const res = await fetch(`${API}/extract/text`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ message }),
  });
  if (!res.ok && res.status !== 422) throw new Error(await res.text());
  const { data } = await res.json();
  return data; // ExtractionResult
}

// ── Image / Video ─────────────────────────────────────────────────────────────
async function extractFromFile(file: File, notes?: string) {
  const type = file.type.startsWith('video/') ? 'video' : 'image';

  // 1. Presign
  const presignRes = await fetch(`${API}/extract/presign`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ mimeType: file.type }),
  });
  if (!presignRes.ok) throw new Error(await presignRes.text());
  const { data: presign } = await presignRes.json();

  // 2. Upload directly to S3 — no auth headers
  const uploadRes = await fetch(presign.uploadUrl, {
    method:  'PUT',
    headers: { 'Content-Type': file.type },
    body:    file,
  });
  if (!uploadRes.ok) throw new Error(`S3 upload failed: ${uploadRes.status}`);

  // 3. Extract
  const extractRes = await fetch(`${API}/extract/media`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      sessionId: presign.sessionId,
      type,
      ...(notes?.trim() ? { notes: notes.trim() } : {}),
    }),
  });
  if (!extractRes.ok && extractRes.status !== 422) throw new Error(await extractRes.text());
  const { data } = await extractRes.json();
  return data; // ExtractionResult
}
```
