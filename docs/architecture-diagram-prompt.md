# Architecture Diagram Prompt — Fundares Platform

Use the following description to generate an architecture diagram.

---

## Prompt

Draw a software architecture diagram for a recycling data management platform called **Fundares**. Use a left-to-right flow. Group components into clearly labeled boundaries. Use color coding: blue for AWS services, green for external/SaaS services, gray for databases, orange for user actors, and white/light for the application layer.

---

### Actors (left side)

Three external actors on the left:

1. **Recolector** (waste collector) — person who sends recycling data
2. **Admin / Fundares** — platform administrator who validates data
3. **Empresa Aliada** (partner company) — company that views its own recycling metrics

---

### Entry channels (middle-left)

Three input channels from the Recolector:

1. **WhatsApp** (via Twilio) → sends text messages and photos
2. **Telegram Bot** → sends text messages, photos, and videos
3. **Web Form** (browser) → uploads text, images, or video directly

---

### Application layer — Next.js on Vercel (center)

A boundary labeled **"Web App — Vercel (Next.js 14)"** containing:

**Webhook handlers:**
- `POST /api/webhook/whatsapp` — receives Twilio WhatsApp messages
- `POST /api/webhook/telegram` — receives Telegram Bot updates

**Internal API:**
- `POST /api/extraer` — triggers AI extraction (authenticated with WEBHOOK_SECRET)
- `POST /api/extracciones` — creates extractions manually from web form
- `POST /api/validar` — admin approves or rejects an extraction
- `GET /api/metricas` — returns impact metrics filtered by company and date
- `GET /api/reporte` — generates PDF report
- `GET /api/reporte-excel` — generates Excel report

**Auth:** NextAuth.js — JWT sessions with two roles: `admin` and `empresa`

**Admin dashboard** (`/admin/*`):
- Dashboard with global metrics
- Validation queue (approve/reject extractions)
- Company management
- Reports (PDF + Excel, per company or global)
- Channel monitoring (Telegram, WhatsApp, Web)
- Education module

**Company dashboard** (`/empresa/*`):
- Real-time impact dashboard (CO₂ saved, water, recycled kg)
- Monthly trend charts and material breakdown
- Personalized tips based on company data
- Reports (PDF + Excel, own data only)
- Education module with interactive tours

---

### AI Extraction Service — AWS (center-right)

A boundary labeled **"Extraction Service — AWS"** containing:

**API Gateway HTTP v2** — public entry point, routes all traffic to Lambda

**Lambda function** `fundares-prod-function` (Node.js 22, 512 MB, 60s timeout):
- `POST /api/v1/extract/text` — extracts data from plain text
- `POST /api/v1/extract/presign` — returns presigned S3 URL for file upload
- `POST /api/v1/extract/media` — extracts data from uploaded image or video

**Amazon Bedrock:**
- **Nova 2 Lite** (primary model, `global.amazon.nova-2-lite-v1:0`) — handles text, images, and video. Uses two-step process for images: first visual description, then structured extraction.
- **Nova Pro** (fallback model, `amazon.nova-pro-v1:0`) — triggered automatically when Nova 2 Lite confidence < 0.75

**S3 bucket** `fundares-prod-collections`:
- Receives direct file uploads from the browser via presigned PUT URL
- Lambda reads media from S3, then deletes it after each Bedrock call
- 2-day lifecycle rule as safety net

**Secrets Manager** `fundares/prod/app`:
- Stores `CORS_ORIGINS` and `LOG_LEVEL`
- Lambda reads at cold start

**CloudWatch Logs:**
- Lambda logs (7-day retention)
- API Gateway access logs (7-day retention)

---

### Database — Neon Postgres (center-bottom)

A boundary labeled **"Database — Neon Postgres (serverless)"** containing six tables:

- `empresas` — registered partner companies
- `perfiles` — users with role `admin` or `empresa`
- `mensajes_recolector` — incoming messages from WhatsApp/Telegram/Web
- `extracciones` — AI-extracted data, pending admin validation
- `recolecciones` — validated and approved collections
- `contenido_educativo` — articles, videos, infographics for education module

The Web App connects to Neon Postgres via **Drizzle ORM**.

---

### Data flow (numbered sequence)

Draw numbered arrows showing the main flow:

1. **Recolector → WhatsApp/Telegram/Web** — sends text, photo, or video of a recycling collection
2. **WhatsApp/Telegram → Webhook handlers** — Twilio and Telegram Bot push events to `/api/webhook/*`
3. **Webhook handler → `mensajes_recolector`** — saves the raw message to the database
4. **Webhook handler → `/api/extraer`** — triggers extraction internally (WEBHOOK_SECRET auth)
5. **Web Form → S3** — browser uploads file directly via presigned URL (bypasses Lambda)
6. **`/api/extraer` → API Gateway → Lambda** — calls the extraction service
7. **Lambda → Bedrock Nova 2 Lite** — sends text/image/video for AI extraction
8. **Lambda → Bedrock Nova Pro** — fallback if confidence < 0.75 (dashed arrow labeled "fallback")
9. **Lambda → S3** — reads and deletes media file after Bedrock call
10. **Lambda → `/api/extraer`** — returns structured result (company, date, materials, confidence)
11. **`/api/extraer` → `extracciones`** — saves extraction with status `pending`
12. **Admin → `/admin/validacion`** — reviews, edits, approves or rejects extraction
13. **`/api/validar` → `recolecciones`** — approved extraction is inserted as validated collection
14. **Empresa → `/empresa/dashboard`** — views real-time metrics, personalized tips, and charts
15. **`/api/metricas` → `recolecciones`** — queries filtered by `empresaId` (empresa sees own data only)
16. **Admin/Empresa → `/api/reporte` or `/api/reporte-excel`** — downloads PDF or Excel report

---

### Security boundaries to highlight

- Draw a dashed border labeled **"Empresa data isolation"** around the `/empresa/*` routes and `recolecciones` query, with a note: *"All queries filtered by session.user.empresaId — companies can only see their own data"*
- Draw a dashed border labeled **"Admin-only"** around `/admin/*` routes and the `extracciones` table
- Add a lock icon on the `POST /api/extraer` internal call with label **"WEBHOOK_SECRET"**
- Add a lock icon on NextAuth with label **"JWT · roles: admin | empresa"**

---

### External services (right side)

On the right side, show:

- **Twilio** — WhatsApp Business API (paid per conversation)
- **Telegram Bot API** — free
- **Vercel** — Next.js hosting + deployments
- **Neon** — serverless Postgres hosting

---

### Layout guidance

- Left column: Actors (Recolector, Admin, Empresa)
- Second column: Entry channels (WhatsApp, Telegram, Web Form)
- Center: Web App (Vercel) — largest block
- Right-center: AWS Extraction Service (Lambda + Bedrock + S3)
- Bottom-center: Neon Postgres database
- Top-right: AWS supporting services (Secrets Manager, CloudWatch)
- Far right: External SaaS logos (Twilio, Telegram, Vercel, Neon)

Use solid arrows for synchronous calls, dashed arrows for async/background calls and the fallback model path. Label each arrow with the HTTP method and path or a short description.
