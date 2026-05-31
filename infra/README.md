# infra/ — Infraestructura AWS CDK

Todos los recursos cloud de Fundares definidos como código con AWS CDK v2. Desplegado en `us-east-1`.

---

## Stacks

| Stack | Descripción |
|-------|-------------|
| `FundaresSharedStack` | Recursos compartidos a nivel de región |
| `FundaresStack-Prod` | Stack de producción — API Gateway, Lambda, S3, IAM |

---

## Recursos

### Lambda — `fundares-prod-function`

| Propiedad | Valor |
|-----------|-------|
| Runtime | Node.js 22.x |
| Memoria | 512 MB |
| Timeout | 10 s |
| Handler | `apps/identification/src/index.ts` → `handler` |
| Build | esbuild — bundle único, minificado, sin source maps |

**Variables de entorno de la Lambda:**

| Variable | Fuente | Valor |
|----------|--------|-------|
| `NODE_ENV` | CDK | `production` |
| `CORS_ORIGINS` | Secrets Manager | `fundares/prod/app` |
| `LOG_LEVEL` | Secrets Manager | `fundares/prod/app` |
| `S3_COLLECTIONS_BUCKET` | CDK | Nombre del bucket (resuelto automáticamente) |
| `BEDROCK_MODEL_ID` | CDK | `global.amazon.nova-2-lite-v1:0` |
| `BEDROCK_FALLBACK_MODEL_ID` | CDK | `amazon.nova-pro-v1:0` |
| `CONFIDENCE_THRESHOLD` | CDK | `0.75` |

---

### API Gateway — HTTP API v2

- **Base URL:** `https://<api-gateway-id>.execute-api.us-east-1.amazonaws.com`
- **Rutas:** `ANY /` y `ANY /{proxy+}` → Lambda (AWS_PROXY, payload format 2.0)
- **Stage:** `$default` (auto-deploy activado)
- **CORS:** todos los orígenes, métodos y headers (`*`)
- **Access logs:** `/aws/api_gw/fundares-prod-api`

**Endpoints expuestos:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/api/v1/health` | Health check |
| `POST` | `/api/v1/extract/presign` | URL prefirmada para subir imagen/video a S3 |
| `POST` | `/api/v1/extract/media` | Extraer datos de imagen o video subido |
| `POST` | `/api/v1/extract/text` | Extraer datos de texto libre |

---

### S3 — `fundares-prod-collections`

Bucket de staging temporal para imágenes y videos procesados por la Lambda.

| Propiedad | Valor |
|-----------|-------|
| Acceso | Privado (block all public) |
| SSL | Obligatorio |
| Lifecycle | Prefijo `sessions/` — expira a los 2 días |
| Eliminación | Destruido con el stack |

La Lambda elimina cada archivo tras procesarlo. El lifecycle de 2 días es una red de seguridad para timeouts.

> Los videos no pueden pasarse a Nova 2 Lite como base64 — deben subirse a este bucket y referenciarse via `s3Location` URI.

---

### Secrets Manager — `fundares/prod/app`

Configuración en runtime. **No gestionada por CDK** — debe crearse antes del primer deploy.

Claves: `CORS_ORIGINS`, `LOG_LEVEL`

Creación inicial:
```bash
aws secretsmanager create-secret \
  --name fundares/prod/app \
  --secret-string '{"CORS_ORIGINS":"*","LOG_LEVEL":"info"}'
```

---

### IAM — `fundares-prod-lambda-exec-role`

| Permiso | Alcance |
|---------|---------|
| `AWSLambdaBasicExecutionRole` | CloudWatch Logs |
| `secretsmanager:GetSecretValue` | `fundares/prod/app` |
| `s3:GetObject/PutObject/DeleteObject` | Bucket de colecciones |
| `bedrock:InvokeModel` | Modelos listados abajo |
| `aws-marketplace:ViewSubscriptions/Subscribe/Unsubscribe` | `*` (primera activación de modelos Bedrock) |

---

### CloudWatch Logs

| Log Group | Retención |
|-----------|-----------|
| `/aws/lambda/fundares-prod-function` | 7 días |
| `/aws/api_gw/fundares-prod-api` | 7 días |

---

## Modelos Bedrock

### Primario — Amazon Nova 2 Lite

| Configuración | Valor |
|---------------|-------|
| Model ID | `global.amazon.nova-2-lite-v1:0` |
| API | Converse API |
| Context window | 1M tokens |
| Max output tokens | 1 000 |
| Temperature | 0.1 |

### Fallback — Amazon Nova Pro

Se activa automáticamente cuando Nova 2 Lite devuelve confianza baja.

| Configuración | Valor |
|---------------|-------|
| Model ID | `amazon.nova-pro-v1:0` |
| Trigger | Confianza < `CONFIDENCE_THRESHOLD` (default 0.75) |

### Modalidades soportadas

| Modalidad | Formatos | Entrega |
|-----------|---------|---------|
| Texto | Texto plano | Request body |
| Imagen | JPEG, PNG, WEBP | Base64 (inline) |
| Video | MP4, MOV, AVI, MKV, WebM | S3 URI (`s3Location`) — máx. 2 min |

### ARNs IAM concedidos

```
arn:aws:bedrock:*:{account}:inference-profile/us.anthropic.claude-haiku-4*
arn:aws:bedrock:*:{account}:inference-profile/us.anthropic.claude-sonnet-4*
arn:aws:bedrock:*::foundation-model/anthropic.claude-haiku-4*
arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4*
arn:aws:bedrock:*::foundation-model/amazon.nova-lite-v1:0
arn:aws:bedrock:*::foundation-model/amazon.nova-pro-v1:0
```

---

## Deploy

```bash
# 1. Bootstrap CDK — una vez por cuenta/región
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1

# 2. Crear el secret — antes del primer deploy
aws secretsmanager create-secret \
  --name fundares/prod/app \
  --secret-string '{"CORS_ORIGINS":"*","LOG_LEVEL":"info"}'

# 3. Deploy stack compartido
npx cdk deploy FundaresSharedStack

# 4. Deploy stack principal
npx cdk deploy FundaresStack-Prod -c environment=prod
```

El CI/CD ejecuta los pasos 3 y 4 automáticamente en cada push a `main`.

---

## Validation Aspects

Aplicados en cada `cdk synth` / `cdk deploy`:

| Aspect | Qué verifica |
|--------|-------------|
| `SecurityValidationAspect` | RDS sin encriptación, security groups permisivos (`0.0.0.0/0`), IAM con wildcard (`Allow * on *`) |
| `CostOptimizationAspect` | ECS task counts altos, RDS multi-AZ, NAT Gateways en dev |
