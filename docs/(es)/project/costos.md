# Estructura de Costos — Fundares

Desglose completo de costos por servicio para la plataforma Fundares en producción.  
Precios en USD · Región `us-east-1` · Mayo 2026.

---

## Resumen ejecutivo

| Escenario | Empresas | Extracciones/mes | Costo mensual total |
|-----------|----------|-----------------|-------------------|
| Piloto | 10 | 120 | **~$3–5** |
| Operación actual | 30 | 600 | **~$8–14** |
| Escala media | 100 | 2 000 | **~$28–48** |
| Escala alta | 500 | 10 000 | **~$120–200** |

El costo dominante es el modelo de IA (~70–80% del total). El resto de servicios es marginal a escala pequeña y media.

---

## 1. Modelos de IA — AWS Bedrock

Tarifas reales del sistema (fuente: `apps/identification/src/modules/identification/pricing.ts`).

### Modelo primario — Amazon Nova 2 Lite

| Métrica | Valor |
|---------|-------|
| Model ID | `global.amazon.nova-2-lite-v1:0` (resuelto como `us.amazon.nova-2-lite-v1:0`) |
| Input | **$0.10 / 1M tokens** |
| Output | **$0.40 / 1M tokens** |
| Ruta | Global cross-region (máxima disponibilidad) |

### Modelo fallback — Amazon Nova Pro

Se activa automáticamente cuando Nova 2 Lite devuelve confianza < 0.75.

| Métrica | Valor |
|---------|-------|
| Model ID | `amazon.nova-pro-v1:0` |
| Input | **$0.80 / 1M tokens** |
| Output | **$3.20 / 1M tokens** |
| Frecuencia estimada | ~10–15% de las extracciones |

---

## 2. Costo por extracción

### Tokens medidos por tipo (fuente: API response `usage`)

| Tipo de input | Input tokens | Output tokens | Modelo |
|---------------|-------------|--------------|--------|
| Texto simple | ~400 | ~80 | Nova 2 Lite |
| Imagen con documento | ~1 100 | ~95 | Nova 2 Lite (two-step) |
| Imagen solo materiales | ~990 | ~72 | Nova 2 Lite (two-step) |
| Video | ~1 400 | ~100 | Nova 2 Lite (via S3 URI) |
| Cualquier tipo (fallback) | mismos | mismos | Nova Pro |

> **Two-step para imágenes:** el servicio hace dos llamadas al modelo — paso 1 descripción visual (~700 tokens input), paso 2 extracción estructurada (~400 tokens input). Los tokens reflejan la suma de ambas llamadas.

### Costo por extracción con Nova 2 Lite

```
Texto:
  400 input  × ($0.10 / 1M) = $0.000040
   80 output × ($0.40 / 1M) = $0.000032
  ─────────────────────────────────────
  Total texto                ≈ $0.000072

Imagen (con documento):
  1 100 input × ($0.10 / 1M) = $0.000110
     95 output × ($0.40 / 1M) = $0.000038
  ──────────────────────────────────────
  Total imagen                ≈ $0.000148

Video:
  1 400 input × ($0.10 / 1M) = $0.000140
    100 output × ($0.40 / 1M) = $0.000040
  ──────────────────────────────────────
  Total video                 ≈ $0.000180
```

### Costo por extracción con Nova Pro (fallback)

```
Texto fallback:
  400 × ($0.80 / 1M) + 80 × ($3.20 / 1M) = $0.000320 + $0.000256 = $0.000576

Imagen fallback:
  1 100 × ($0.80 / 1M) + 95 × ($3.20 / 1M) = $0.000880 + $0.000304 = $0.001184
```

> Nova Pro cuesta ~8× más que Nova 2 Lite. Al 10% de fallback, el impacto neto es +10–15% sobre el costo base de Bedrock.

### Costo promedio ponderado por extracción

Asumiendo mix realista: 60% texto, 35% imagen, 5% video · 10% fallback rate:

```
Base (sin fallback):
  0.60 × $0.000072 + 0.35 × $0.000148 + 0.05 × $0.000180
  = $0.000043 + $0.000052 + $0.000009
  = $0.000104

Con 10% fallback sobre base (promedio imagen):
  + 0.10 × $0.001184 × 0.35 ≈ +$0.000041

Promedio total por extracción ≈ $0.000145
```

---

## 3. Infraestructura AWS

### Lambda — `fundares-prod-function`

| Config | Valor |
|--------|-------|
| Memoria | 512 MB |
| Timeout | 60 s |
| Duración promedio por extracción | ~5–8 s (limitado por Bedrock) |
| Free tier | 1M requests/mes + 400K GB-s/mes |

**Costo después de free tier:**

| Concepto | Tarifa | Por extracción (7s avg) |
|----------|--------|------------------------|
| Requests | $0.20 / 1M | $0.0000002 |
| Duration (512 MB × 7s) | $0.0000083 / GB-s | $0.0000290 |
| **Total Lambda** | | **≈ $0.000029** |

A escala pequeña (< 1M requests/mes) el free tier cubre la mayor parte.

| Extracciones/mes | Costo Lambda estimado |
|-----------------|----------------------|
| 600 | ~$0.02 |
| 2 000 | ~$0.06 |
| 10 000 | ~$0.30 |
| 100 000 | ~$2.90 |

### API Gateway — HTTP API v2

| Tarifa | Valor |
|--------|-------|
| Por request | $1.00 / 1M requests |
| Free tier | 1M requests/mes (12 meses) |

| Extracciones/mes | Costo API GW |
|-----------------|-------------|
| < 1M | ~$0 (free tier) |
| 1M | $1.00 |

### S3 — `fundares-prod-collections`

Solo para imágenes y videos (no para texto). Lifecycle de 2 días elimina los archivos automáticamente.

| Concepto | Tarifa | Estimado (600 medias/mes) |
|----------|--------|--------------------------|
| PUT requests | $0.005 / 1K | ~$0.003 |
| GET requests | $0.0004 / 1K | ~$0.0003 |
| Storage | $0.023 / GB-mes | ~$0 (lifecycle 2 días) |
| **Total S3** | | **< $0.01/mes** |

### Secrets Manager — `fundares/prod/app`

| Concepto | Tarifa |
|----------|--------|
| Por secret | $0.40 / mes |
| API calls | $0.05 / 10K calls |
| **Total** | **~$0.40/mes** |

### CloudWatch Logs

| Concepto | Tarifa | Estimado |
|----------|--------|---------|
| Ingesta | $0.50 / GB | ~$0.05/mes (logs livianos) |
| Storage (7 días) | $0.03 / GB | ~$0.01/mes |
| **Total CloudWatch** | | **< $0.10/mes** |

### Resumen AWS mensual estimado

| Servicio | 600 extrac/mes | 2 000 extrac/mes | 10 000 extrac/mes |
|----------|---------------|-----------------|------------------|
| Bedrock (Nova 2 Lite) | $0.09 | $0.29 | $1.45 |
| Bedrock (Nova Pro fallback ~10%) | $0.04 | $0.14 | $0.71 |
| Lambda | $0.02 | $0.06 | $0.30 |
| API Gateway | ~$0 | ~$0 | ~$0.01 |
| S3 | ~$0.01 | ~$0.02 | ~$0.05 |
| Secrets Manager | $0.40 | $0.40 | $0.40 |
| CloudWatch | ~$0.10 | ~$0.10 | ~$0.15 |
| **Total AWS** | **~$0.66** | **~$1.01** | **~$3.07** |

---

## 4. Base de datos — Neon Postgres

| Plan | Precio | Incluye |
|------|--------|---------|
| Free | $0/mes | 0.5 GB storage, 191.9 compute hours/mes, 1 proyecto |
| Launch | $19/mes | 10 GB storage, compute bajo demanda |
| Scale | $69/mes | 50 GB storage, compute auto-scale, point-in-time recovery |

**Para Fundares:** el Free tier es suficiente para la operación piloto (< 50 empresas, < 10K recolecciones totales). El plan Launch ($19/mes) cubre crecimiento hasta cientos de empresas.

| Escenario | Plan recomendado | Costo |
|-----------|-----------------|-------|
| Piloto (< 50 empresas) | Free | **$0** |
| Operación (50–200 empresas) | Launch | **$19/mes** |
| Escala (> 200 empresas) | Scale | **$69/mes** |

---

## 5. Dashboard web — Vercel

| Plan | Precio | Incluye |
|------|--------|---------|
| Hobby | $0/mes | Proyectos personales, sin SLA |
| Pro | $20/mes | Equipos, dominio custom, SLA, preview deployments |
| Enterprise | Custom | SLA 99.99%, soporte dedicado |

**Para Fundares:** el plan Pro ($20/mes) es el mínimo para uso comercial (los términos del Hobby prohíben uso comercial).

---

## 6. Mensajería

### Twilio — WhatsApp Business API

| Concepto | Tarifa | Notas |
|----------|--------|-------|
| Conversación de servicio | $0.015 / conversación (24h) | Iniciada por el usuario |
| Conversación de utilidad | $0.015 / conversación | Notificaciones transaccionales |
| Mensajes adicionales dentro de conversación | $0.005 / mensaje | |
| Número de teléfono | $1.00 / mes | |

**Estimado para Fundares** (600 recolecciones/mes, cada recoleccion = 1-2 mensajes en misma conversación):

| Extracciones/mes | Conversaciones WhatsApp | Costo Twilio |
|-----------------|------------------------|-------------|
| 600 | ~600 | ~$9–12 |
| 2 000 | ~2 000 | ~$30–40 |
| 10 000 | ~10 000 | ~$150–200 |

### Telegram Bot API

Gratuito. Sin límites de mensajes para bots con bajo volumen.

---

## 7. Proyección mensual total por escenario

### Escenario A — Piloto (10 empresas, 120 extracciones/mes)

| Servicio | Costo |
|----------|-------|
| AWS (Bedrock + Lambda + infra) | ~$0.50 |
| Neon Postgres | $0 (free tier) |
| Vercel | $20 |
| Twilio WhatsApp | ~$2 |
| Telegram | $0 |
| **Total mensual** | **~$22–23** |

> La mayor parte del costo ($20) es la plataforma fija de Vercel, no el uso.

---

### Escenario B — Operación actual (30 empresas, 600 extracciones/mes)

| Servicio | Costo |
|----------|-------|
| AWS (Bedrock + Lambda + infra) | ~$1.50 |
| Neon Postgres | $0 (free tier) |
| Vercel Pro | $20 |
| Twilio WhatsApp | ~$10 |
| Telegram | $0 |
| **Total mensual** | **~$31–33** |

---

### Escenario C — Escala media (100 empresas, 2 000 extracciones/mes)

| Servicio | Costo |
|----------|-------|
| AWS (Bedrock + Lambda + infra) | ~$2.50 |
| Neon Postgres | $19 (Launch) |
| Vercel Pro | $20 |
| Twilio WhatsApp | ~$35 |
| Telegram | $0 |
| **Total mensual** | **~$76–80** |

---

### Escenario D — Escala alta (500 empresas, 10 000 extracciones/mes)

| Servicio | Costo |
|----------|-------|
| AWS (Bedrock + Lambda + infra) | ~$8 |
| Neon Postgres | $69 (Scale) |
| Vercel Pro | $20 |
| Twilio WhatsApp | ~$170 |
| Telegram | $0 |
| **Total mensual** | **~$267–270** |

---

## 8. Costo por empresa aliada

| Escenario | Empresas | Costo total/mes | Costo por empresa/mes |
|-----------|----------|----------------|----------------------|
| Piloto | 10 | ~$23 | **~$2.30** |
| Operación | 30 | ~$33 | **~$1.10** |
| Escala media | 100 | ~$78 | **~$0.78** |
| Escala alta | 500 | ~$268 | **~$0.54** |

La plataforma tiene **economías de escala favorables** — el costo por empresa baja a medida que crece la base de empresas aliadas, porque los costos fijos (Vercel, Neon, Secrets Manager) se distribuyen.

---

## 9. Oportunidades de optimización

| Optimización | Ahorro estimado | Complejidad |
|-------------|----------------|-------------|
| Prompt caching en Bedrock (75% menos en tokens del sistema prompt) | ~15–20% en Bedrock | Media |
| Comprimir system prompt (~200 tokens menos) | ~$0.02 / 1K extracciones | Baja |
| Usar Telegram como canal principal (0% costo mensajería) | Ahorro total en Twilio | Baja |
| Neon Scale → Aurora Serverless v2 (> 500 empresas) | Variable | Alta |
| Reservar throughput Bedrock (Priority tier, > 50K extrac/mes) | Reduce latencia, no costo | Alta |
| Batch processing para reportes (50% descuento Bedrock) | ~$0 (reportes no usan Bedrock) | N/A |

---

## 10. Fórmula de costo mensual

```
costo_mensual =
    extracciones_texto      × $0.000072
  + extracciones_imagen     × $0.000148
  + extracciones_video      × $0.000180
  + extracciones_fallback   × $0.001184   # ~10% del total
  + lambda_duracion_total_gb_segundos × $0.0000083
  + conversaciones_whatsapp × $0.015
  + neon_plan               # $0 / $19 / $69
  + vercel_plan             # $20 (Pro)
  + secrets_manager         # $0.40
  + cloudwatch              # ~$0.10
```

---

## Notas

- Los precios de AWS Bedrock son **on-demand** (sin compromisos). Existe un tier Priority con SLA de latencia garantizada que cuesta ~75% más, solo relevante si se requiere SLA estricto.
- Los precios de Twilio varían por país. Las tarifas aquí aplican a Bolivia/LATAM — verificar en [twilio.com/pricing](https://www.twilio.com/pricing).
- El costo de Bedrock **ya incluye** el modelo fallback (Nova Pro) cuando aplica. La tasa de fallback del 10% es una estimación conservadora; en práctica puede ser menor con buenos prompts.
- Vercel cobra por banda ancha adicional ($0.15/GB) si se supera el límite del plan Pro (1 TB/mes) — irrelevante a esta escala.
