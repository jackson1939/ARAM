# Cost Structure — Fundares

Full service-by-service cost breakdown for the Fundares platform in production.  
Prices in USD · Region `us-east-1` · May 2026.

---

## Executive summary

| Scenario | Companies | Extractions/month | Total monthly cost |
|----------|-----------|------------------|--------------------|
| Pilot | 10 | 120 | **~$22–23** |
| Current operation | 30 | 600 | **~$31–33** |
| Mid-scale | 100 | 2 000 | **~$76–80** |
| High-scale | 500 | 10 000 | **~$267–270** |

The AI model is the dominant cost (~70–80% of total at scale). All other services are marginal at small-to-medium scale. The largest fixed cost is Vercel Pro ($20/month), not usage.

---

## 1. AI Models — AWS Bedrock

Rates sourced directly from `apps/identification/src/modules/identification/pricing.ts`.

### Primary model — Amazon Nova 2 Lite

| Setting | Value |
|---------|-------|
| Model ID | `global.amazon.nova-2-lite-v1:0` (resolved as `us.amazon.nova-2-lite-v1:0`) |
| Input | **$0.10 / 1M tokens** |
| Output | **$0.40 / 1M tokens** |
| Routing | Global cross-region (maximum availability) |

### Fallback model — Amazon Nova Pro

Triggered automatically when Nova 2 Lite returns confidence < 0.75.

| Setting | Value |
|---------|-------|
| Model ID | `amazon.nova-pro-v1:0` |
| Input | **$0.80 / 1M tokens** |
| Output | **$3.20 / 1M tokens** |
| Estimated frequency | ~10–15% of extractions |

---

## 2. Cost per extraction

### Measured token counts by input type (source: API response `usage`)

| Input type | Input tokens | Output tokens | Model |
|------------|-------------|--------------|-------|
| Plain text | ~400 | ~80 | Nova 2 Lite |
| Image with document | ~1 100 | ~95 | Nova 2 Lite (two-step) |
| Image of materials only | ~990 | ~72 | Nova 2 Lite (two-step) |
| Video | ~1 400 | ~100 | Nova 2 Lite (via S3 URI) |
| Any type (fallback) | same | same | Nova Pro |

> **Two-step for images:** the service makes two sequential model calls — step 1 visual description (~700 input tokens), step 2 structured extraction (~400 input tokens). Token counts reflect the combined total of both calls.

### Cost per extraction — Nova 2 Lite

```
Text:
  400 input  × ($0.10 / 1M) = $0.000040
   80 output × ($0.40 / 1M) = $0.000032
  ─────────────────────────────────────
  Total text                 ≈ $0.000072

Image (with document):
  1 100 input × ($0.10 / 1M) = $0.000110
     95 output × ($0.40 / 1M) = $0.000038
  ──────────────────────────────────────
  Total image                 ≈ $0.000148

Video:
  1 400 input × ($0.10 / 1M) = $0.000140
    100 output × ($0.40 / 1M) = $0.000040
  ──────────────────────────────────────
  Total video                 ≈ $0.000180
```

### Cost per extraction — Nova Pro (fallback)

```
Text fallback:
  400 × ($0.80 / 1M) + 80 × ($3.20 / 1M) = $0.000320 + $0.000256 = $0.000576

Image fallback:
  1 100 × ($0.80 / 1M) + 95 × ($3.20 / 1M) = $0.000880 + $0.000304 = $0.001184
```

> Nova Pro costs ~8× more than Nova 2 Lite. At a 10% fallback rate, the net impact is +10–15% on the base Bedrock cost.

### Weighted average cost per extraction

Assuming a realistic input mix: 60% text, 35% image, 5% video · 10% fallback rate:

```
Base (no fallback):
  0.60 × $0.000072 + 0.35 × $0.000148 + 0.05 × $0.000180
  = $0.000043 + $0.000052 + $0.000009
  = $0.000104

With 10% fallback (average image cost):
  + 0.10 × $0.001184 × 0.35 ≈ +$0.000041

Weighted average per extraction ≈ $0.000145
```

---

## 3. AWS Infrastructure

### Lambda — `fundares-prod-function`

| Config | Value |
|--------|-------|
| Memory | 512 MB |
| Timeout | 60 s |
| Average duration per extraction | ~5–8 s (Bedrock-bound) |
| Free tier | 1M requests/month + 400K GB-s/month |

**Cost after free tier:**

| Item | Rate | Per extraction (7s avg) |
|------|------|------------------------|
| Requests | $0.20 / 1M | $0.0000002 |
| Duration (512 MB × 7s) | $0.0000083 / GB-s | $0.0000290 |
| **Total Lambda** | | **≈ $0.000029** |

At small scale (< 1M requests/month) the free tier covers most of the cost.

| Extractions/month | Estimated Lambda cost |
|------------------|-----------------------|
| 600 | ~$0.02 |
| 2 000 | ~$0.06 |
| 10 000 | ~$0.30 |
| 100 000 | ~$2.90 |

### API Gateway — HTTP API v2

| Rate | Value |
|------|-------|
| Per request | $1.00 / 1M requests |
| Free tier | 1M requests/month (first 12 months) |

| Extractions/month | API GW cost |
|------------------|------------|
| < 1M | ~$0 (free tier) |
| 1M | $1.00 |

### S3 — `fundares-prod-collections`

Used only for images and videos (not text). A 2-day lifecycle rule deletes files automatically after each Lambda invocation.

| Item | Rate | Estimate (600 media/month) |
|------|------|---------------------------|
| PUT requests | $0.005 / 1K | ~$0.003 |
| GET requests | $0.0004 / 1K | ~$0.0003 |
| Storage | $0.023 / GB-month | ~$0 (2-day lifecycle) |
| **Total S3** | | **< $0.01/month** |

### Secrets Manager — `fundares/prod/app`

| Item | Rate |
|------|------|
| Per secret | $0.40 / month |
| API calls | $0.05 / 10K calls |
| **Total** | **~$0.40/month** |

### CloudWatch Logs

| Item | Rate | Estimate |
|------|------|----------|
| Ingestion | $0.50 / GB | ~$0.05/month (lightweight logs) |
| Storage (7-day retention) | $0.03 / GB | ~$0.01/month |
| **Total CloudWatch** | | **< $0.10/month** |

### AWS monthly summary

| Service | 600 extrac/month | 2 000 extrac/month | 10 000 extrac/month |
|---------|-----------------|-------------------|---------------------|
| Bedrock (Nova 2 Lite) | $0.09 | $0.29 | $1.45 |
| Bedrock (Nova Pro fallback ~10%) | $0.04 | $0.14 | $0.71 |
| Lambda | $0.02 | $0.06 | $0.30 |
| API Gateway | ~$0 | ~$0 | ~$0.01 |
| S3 | ~$0.01 | ~$0.02 | ~$0.05 |
| Secrets Manager | $0.40 | $0.40 | $0.40 |
| CloudWatch | ~$0.10 | ~$0.10 | ~$0.15 |
| **Total AWS** | **~$0.66** | **~$1.01** | **~$3.07** |

---

## 4. Database — Neon Postgres

| Plan | Price | Includes |
|------|-------|---------|
| Free | $0/month | 0.5 GB storage, 191.9 compute hours/month, 1 project |
| Launch | $19/month | 10 GB storage, on-demand compute |
| Scale | $69/month | 50 GB storage, auto-scale compute, point-in-time recovery |

The Free tier is sufficient for the pilot phase (< 50 companies, < 10K total collections). The Launch plan ($19/month) covers growth to hundreds of companies.

| Scenario | Recommended plan | Cost |
|----------|-----------------|------|
| Pilot (< 50 companies) | Free | **$0** |
| Operation (50–200 companies) | Launch | **$19/month** |
| Scale (> 200 companies) | Scale | **$69/month** |

---

## 5. Web dashboard — Vercel

| Plan | Price | Includes |
|------|-------|---------|
| Hobby | $0/month | Personal projects, no SLA |
| Pro | $20/month | Teams, custom domain, SLA, preview deployments |
| Enterprise | Custom | 99.99% SLA, dedicated support |

The Pro plan ($20/month) is the minimum for commercial use — Hobby terms prohibit commercial projects.

---

## 6. Messaging

### Twilio — WhatsApp Business API

| Item | Rate | Notes |
|------|------|-------|
| Service conversation | $0.015 / conversation (24h window) | User-initiated |
| Utility conversation | $0.015 / conversation | Transactional notifications |
| Additional messages within conversation | $0.005 / message | |
| Phone number | $1.00 / month | |

**Estimate for Fundares** (600 collections/month, each = 1–2 messages in the same 24h window):

| Extractions/month | WhatsApp conversations | Twilio cost |
|------------------|----------------------|------------|
| 600 | ~600 | ~$9–12 |
| 2 000 | ~2 000 | ~$30–40 |
| 10 000 | ~10 000 | ~$150–200 |

### Telegram Bot API

Free. No per-message cost for low-volume bots.

---

## 7. Total monthly projections by scenario

### Scenario A — Pilot (10 companies, 120 extractions/month)

| Service | Cost |
|---------|------|
| AWS (Bedrock + Lambda + infra) | ~$0.50 |
| Neon Postgres | $0 (free tier) |
| Vercel Pro | $20 |
| Twilio WhatsApp | ~$2 |
| Telegram | $0 |
| **Total monthly** | **~$22–23** |

> The dominant cost ($20) is the fixed Vercel platform fee, not usage.

---

### Scenario B — Current operation (30 companies, 600 extractions/month)

| Service | Cost |
|---------|------|
| AWS (Bedrock + Lambda + infra) | ~$1.50 |
| Neon Postgres | $0 (free tier) |
| Vercel Pro | $20 |
| Twilio WhatsApp | ~$10 |
| Telegram | $0 |
| **Total monthly** | **~$31–33** |

---

### Scenario C — Mid-scale (100 companies, 2 000 extractions/month)

| Service | Cost |
|---------|------|
| AWS (Bedrock + Lambda + infra) | ~$2.50 |
| Neon Postgres | $19 (Launch) |
| Vercel Pro | $20 |
| Twilio WhatsApp | ~$35 |
| Telegram | $0 |
| **Total monthly** | **~$76–80** |

---

### Scenario D — High-scale (500 companies, 10 000 extractions/month)

| Service | Cost |
|---------|------|
| AWS (Bedrock + Lambda + infra) | ~$8 |
| Neon Postgres | $69 (Scale) |
| Vercel Pro | $20 |
| Twilio WhatsApp | ~$170 |
| Telegram | $0 |
| **Total monthly** | **~$267–270** |

---

## 8. Cost per partner company

| Scenario | Companies | Total/month | Cost per company/month |
|----------|-----------|------------|------------------------|
| Pilot | 10 | ~$23 | **~$2.30** |
| Operation | 30 | ~$33 | **~$1.10** |
| Mid-scale | 100 | ~$78 | **~$0.78** |
| High-scale | 500 | ~$268 | **~$0.54** |

The platform has **favorable economies of scale** — the per-company cost decreases as the partner base grows, because fixed costs (Vercel, Neon, Secrets Manager) are spread across more companies.

---

## 9. Optimization opportunities

| Optimization | Estimated saving | Complexity |
|-------------|-----------------|------------|
| Bedrock prompt caching (75% reduction on system prompt tokens) | ~15–20% on Bedrock | Medium |
| Compress system prompt (~200 fewer tokens) | ~$0.02 / 1K extractions | Low |
| Use Telegram as primary channel (zero messaging cost) | Full Twilio savings | Low |
| Neon Scale → Aurora Serverless v2 (> 500 companies) | Variable | High |
| Reserve Bedrock throughput — Priority tier (> 50K extrac/month) | Reduces latency, not cost | High |
| Batch processing for reports (50% Bedrock discount) | ~$0 (reports don't use Bedrock) | N/A |

---

## 10. Monthly cost formula

```
monthly_cost =
    text_extractions      × $0.000072
  + image_extractions     × $0.000148
  + video_extractions     × $0.000180
  + fallback_extractions  × $0.001184   # ~10% of total
  + lambda_total_gb_seconds × $0.0000083
  + whatsapp_conversations × $0.015
  + neon_plan               # $0 / $19 / $69
  + vercel_plan             # $20 (Pro)
  + secrets_manager         # $0.40
  + cloudwatch              # ~$0.10
```

---

## Notes

- AWS Bedrock prices are **on-demand** (no commitment). A Priority tier with guaranteed latency SLA exists at ~75% premium — only relevant if strict SLA is required.
- Twilio pricing varies by country. Rates here apply to Bolivia/LATAM — verify current rates at [twilio.com/pricing](https://www.twilio.com/pricing).
- The Bedrock cost **already includes** the Nova Pro fallback when triggered. The 10% fallback rate is a conservative estimate; in practice it may be lower with well-tuned prompts.
- Vercel charges for additional bandwidth ($0.15/GB) beyond the Pro plan limit (1 TB/month) — irrelevant at this scale.
- Spanish version of this document: [`docs/(es)/project/costos.md`](../../(es)/project/costos.md)
