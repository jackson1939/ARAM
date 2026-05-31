# apps/web — Dashboard Fundares

Panel de administración y empresas para la plataforma Fundares. Construido con Next.js 14 App Router, dos roles de acceso diferenciados, y conexión directa al servicio de extracción IA.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS |
| Base de datos | Neon Postgres via Drizzle ORM (`@fundares/db`) |
| Auth | NextAuth.js (`@fundares/auth`) — JWT, roles |
| Reportes | @react-pdf/renderer · SheetJS xlsx |
| Charts | Recharts |
| Tours | intro.js |
| Notificaciones | react-hot-toast |
| Storage | Vercel Blob |
| Deploy | Vercel |

---

## Roles y acceso

El sistema tiene dos roles. El middleware (`middleware.ts`) los separa por prefijo de ruta:

| Rol | Rutas accesibles | Restricción |
|-----|-----------------|-------------|
| `admin` | `/admin/*` | Bloqueado de `/empresa/*` |
| `empresa` | `/empresa/*` | Bloqueado de `/admin/*` |

La sesión contiene `{ id, rol, empresaId, name, email }`. Los datos en la DB siempre se filtran por `empresaId` para el rol empresa — no puede ver datos de otras empresas.

---

## Rutas

### Admin

| Ruta | Descripción |
|------|-------------|
| `/admin/dashboard` | Métricas globales en tiempo real: kg reciclados, CO₂ evitado, agua ahorrada, árbol equivalentes. Gráficos por material y canal de entrada. Últimas 8 extracciones. |
| `/admin/validacion` | Cola de extracciones pendientes con calendario mensual. Permite aprobar, editar campos o rechazar cada extracción. Al aprobar se inserta en `recolecciones`. |
| `/admin/empresas` | Lista y creación de empresas aliadas. Generación de credenciales de acceso (usuario + contraseña) por empresa. |
| `/admin/reportes` | Genera reportes filtrados por año, mes o rango personalizado. Puede exportar por empresa específica o consolidado global. Descarga PDF y Excel. |
| `/admin/monitoreo` | Estadísticas de canales (Telegram, WhatsApp, Web): mensajes recibidos, estados de extracción, usuarios únicos, kg totales. |
| `/admin/educacion` | Guías interactivas (intro.js tours) y contenido educativo publicado. Vista admin y empresa conmutable. |
| `/admin/demostracion` | Página de presentación del sistema con animaciones. |

### Empresa

| Ruta | Descripción |
|------|-------------|
| `/empresa/dashboard` | Impacto ambiental propio: métricas, gráfico de evolución mensual, distribución por material, últimas recolecciones validadas. Se refresca cada 30 segundos. |
| `/empresa/reportes` | Reporte de la propia empresa con filtros de fecha. Descarga PDF y Excel. |
| `/empresa/educacion` | Guías interactivas y contenido educativo. |
| `/empresa/demostracion` | Presentación del sistema. |
| `/empresa/extraer` | Formulario de extracción directo (texto, imagen, video) — acceso desde dashboard via botón "Nueva recolección". |
| `/empresa/ingreso-datos` | Ruta auxiliar de ingreso manual de datos. |

---

## APIs

### Datos y métricas

**`GET /api/metricas`**  
Retorna métricas de impacto, serie temporal mensual (12 meses), distribución por material y últimas 50 recolecciones.  
Empresa: siempre filtrado por `session.user.empresaId`.  
Admin: acepta `?empresa_id=` opcional; sin él devuelve datos globales.  
Parámetros: `?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&empresa_id=`

**`GET /api/empresas`**  
Lista empresas con datos básicos. Solo admin.

**`GET /api/usuarios`**  
Lista usuarios de una empresa. Solo admin.

### Extracciones

**`POST /api/extraer`**  
Llama al servicio de identificación IA y guarda el resultado como extracción pendiente. Autenticado con `WEBHOOK_SECRET` para llamadas desde webhooks.

**`GET /api/extracciones`**  
Lista extracciones filtradas por estado (`?estado=pendiente|aprobado|rechazado`). Solo admin.

**`POST /api/extracciones`**  
Crea una extracción manualmente (desde el formulario web). Empresa solo puede crear para sí misma.

**`POST /api/validar`**  
Aprueba o rechaza una extracción. Al aprobar inserta en `recolecciones`. Solo admin.

### Reportes

**`GET /api/reporte`**  
Genera y descarga PDF. Parámetros: `?empresa_id=&desde=YYYY-MM-DD&hasta=YYYY-MM-DD`.  
Sin `empresa_id` (solo admin): reporte global con desglose por empresa.

**`GET /api/reporte-excel`**  
Genera y descarga `.xlsx` con 4-5 hojas: Resumen, Por Material, Por Mes, Por Empresa (solo global), Detalle.  
Mismos parámetros que `/api/reporte`.

### Webhooks y canales

**`POST /api/webhook/whatsapp`**  
Webhook Twilio. Guarda mensaje, dispara extracción IA via `/api/extraer`.

**`POST /api/webhook/telegram`**  
Webhook Telegram Bot. Mismo flujo que WhatsApp.

**`GET /api/telegram/health`**  
Estado del bot de Telegram.

**`POST /api/telegram/setup`**  
Registra el webhook URL del bot de Telegram.

### Monitoreo y educación

**`GET /api/monitoreo`**  
Estadísticas de canales agrupadas por `canal` (telegram, whatsapp, web).

**`GET /api/educacion`**  
Lista contenido educativo publicado.

---

## Sistema de reportes

### PDF (`lib/pdf.ts`)
Usa `@react-pdf/renderer`. Genera un documento A4 con:
- Encabezado con nombre de empresa y período
- Métricas de impacto (4 cajas: kg, CO₂, agua, árboles)
- Tabla por material
- Tabla por mes
- **Tabla por empresa** (solo en reporte global)

### Excel (`lib/excel.ts`)
Usa `SheetJS (xlsx)`. Genera un `.xlsx` con hojas:
- **Resumen** — métricas de impacto
- **Por Material** — kg por tipo de material
- **Por Mes** — kg por mes ordenado
- **Por Empresa** — kg por empresa (solo en reporte global)
- **Detalle** — filas individuales con empresa, material, kg, fecha, validador

---

## Tours interactivos (`lib/tours.ts`)

Usa intro.js para guías paso a paso. Cada tour tiene:
- `tourId` — identificador único
- `href` — ruta donde arranca el tour
- `steps[]` — pasos con elemento, título, descripción, posición
- `waitForClick` en un step — oculta el botón "Siguiente" y espera que el usuario haga click en el elemento resaltado antes de avanzar

Los tours se activan via `?tour=<tourId>` en la URL. El componente `TourStarter` (en `ShellLayout`) lee el parámetro y lanza el tour después de que la página termina de renderizar.

**Tours disponibles:**

| tourId | Ruta | Descripción |
|--------|------|-------------|
| `admin-dashboard` | `/admin/dashboard` | Métricas, gráficos e impacto global |
| `admin-validacion` | `/admin/validacion` | Calendario y flujo de validación |
| `admin-empresas` | `/admin/empresas` | Creación y gestión de empresas |
| `admin-reportes` | `/admin/reportes` | Filtros y descarga de reportes |
| `admin-monitoreo` | `/admin/monitoreo` | Canales y estadísticas |
| `nueva-recoleccion-admin` | `/admin/dashboard` | Crea una recolección (espera click real en el botón) |
| `empresa-dashboard` | `/empresa/dashboard` | Métricas propias y gráficos |
| `empresa-reportes` | `/empresa/reportes` | Filtros y descarga de reporte propio |
| `nueva-recoleccion-empresa` | `/empresa/dashboard` | Crea una recolección (espera click real en el botón) |

---

## Formulario de extracción (`NuevaRecoleccionForm`)

Drawer deslizante accesible desde el header (botón "+ Nueva recolección").

**Fases:**
1. **input** — el usuario ingresa texto, imagen o video
2. **extracting** — spinner mientras la IA procesa
3. **review** — editar empresa, fecha, materiales y notas antes de guardar
4. **saved** — confirmación con opción de crear otra

**Flujo de imagen/video:**
```
1. POST /api/v1/extract/presign  → obtiene sessionId + uploadUrl
2. PUT <uploadUrl>               → sube archivo directo a S3
3. POST /api/v1/extract/media    → IA analiza desde S3, retorna datos estructurados
```

---

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DATABASE_URL` | ✅ | Connection string Neon Postgres |
| `NEXTAUTH_SECRET` | ✅ | Secret para firmar JWT |
| `NEXTAUTH_URL` | ✅ | URL base de la app (ej: `https://fundares.vercel.app`) |
| `WEBHOOK_SECRET` | ✅ | Token interno para autenticar llamadas a `/api/extraer` |
| `ANTHROPIC_API_KEY` | opcional | Para features adicionales de IA en el web |
| `NEXT_PUBLIC_IDENTIFICATION_API` | ✅ | URL base del servicio de extracción |
| `TWILIO_ACCOUNT_SID` | ✅ | Para webhook WhatsApp |
| `TWILIO_AUTH_TOKEN` | ✅ | Para verificar firma Twilio |
| `TELEGRAM_BOT_TOKEN` | ✅ | Token del bot de Telegram |
| `BLOB_READ_WRITE_TOKEN` | opcional | Para subir fotos a Vercel Blob |

---

## Desarrollo

```bash
# Desde la raíz del monorepo
npm run dev:web

# O directamente
cd apps/web
npm run dev
```

La app corre en `http://localhost:3000`.

---

## Build y deploy

```bash
# Build (desde raíz)
npm run build

# Build solo web
turbo run build --filter=web
```

Deploy automático en Vercel al hacer push a `main`. Build command: `cd ../.. && turbo run build --filter=web`.
