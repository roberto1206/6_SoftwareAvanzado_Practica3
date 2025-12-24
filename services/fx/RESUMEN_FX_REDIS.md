# Resumen de Implementación: FX Service y Redis

## ✅ Completado

### 1. FX Service - Implementación Completa

Se creó un servicio de conversión de divisas con **TODAS** las características requeridas por la práctica:

#### 📁 Estructura de Archivos Creados

```
services/fx/
├── src/
│   ├── config/
│   │   └── fx.config.ts              # Configuración centralizada con env vars
│   ├── controllers/
│   │   └── fx.controller.ts          # Endpoints REST: /fx/health, /fx/rate, /fx/convert
│   ├── interfaces/
│   │   └── fx.interface.ts           # TypeScript interfaces
│   ├── services/
│   │   ├── fx.service.ts             # Lógica principal de orquestación
│   │   ├── redis.service.ts          # Cliente Redis con caché y stale support
│   │   └── external-api.service.ts   # Llamadas a APIs externas con resiliencia
│   ├── app.module.ts                 # Módulo principal actualizado
│   └── main.ts                       # Bootstrap con configuración
├── Dockerfile                         # Multi-stage build optimizado
├── package.json                       # Dependencias actualizadas
├── .env.example                       # Template de variables de entorno
└── README.md                          # Documentación completa del servicio
```

#### ⚡ Características Implementadas

**1. Proveedor Principal (Primary API)**
- ✅ API: `exchangerate-api.com`
- ✅ Timeout configurable (default: 5000ms)
- ✅ Retry con backoff exponencial (3 intentos)
- ✅ Circuit breaker independiente

**2. Proveedor Secundario (Fallback)**
- ✅ API: `frankfurter.app` (no requiere API key)
- ✅ Se activa automáticamente cuando falla el primario
- ✅ Mismas características de resiliencia

**3. Caché Redis**
- ✅ Cliente `ioredis` con reconexión automática
- ✅ TTL configurable (default: 3600 segundos = 1 hora)
- ✅ Formato de clave: `fx:BASE:QUOTE` (ej. `fx:USD:GTQ`)
- ✅ Soporte para datos stale como último recurso

**4. Degradación Elegante**
```
Flujo implementado:
1. Intenta caché → si existe, retorna inmediatamente
2. Intenta API principal → si funciona, cachea y retorna
3. Intenta API secundaria → si funciona, cachea y retorna
4. Intenta caché stale → si existe, retorna con source="stale-cache"
5. Retorna error 503 con mensaje descriptivo
```

**5. Resiliencia Completa**
- ✅ **Timeout**: Configurable por env var (FX_TIMEOUT)
- ✅ **Retry**: 3 intentos con backoff exponencial (1s, 2s, 4s)
- ✅ **Circuit Breaker**: Usando librería `opossum`
  - Estados: closed, open, half-open
  - Umbral configurable (default: 50% de errores)
  - Reset timeout configurable
  - Métricas expuestas en `/fx/health`

#### 🌐 Endpoints Implementados

1. **GET /fx/health**
   - Health check completo
   - Estado de Redis
   - Estado de circuit breakers (primary y secondary)

2. **GET /fx/rate?base=USD&quote=GTQ**
   - Obtiene tipo de cambio
   - Indica fuente: cache | primary | secondary | stale-cache

3. **POST /fx/convert**
   - Convierte monto entre monedas
   - Body: `{ amount, from, to }`

#### 📦 Dependencias Agregadas

```json
{
  "@nestjs/config": "^3.1.1",     // Gestión de configuración
  "axios": "^1.6.2",              // Cliente HTTP
  "ioredis": "^5.3.2",            // Cliente Redis
  "opossum": "^8.1.2"             // Circuit breaker
}
```

### 2. Redis - Infraestructura

#### Docker Compose
- ✅ Agregado servicio Redis 7 Alpine
- ✅ Volumen persistente (redis-data)
- ✅ Health check configurado
- ✅ Puerto 6379 expuesto

#### Kubernetes Manifiestos Creados

```
k8s/
├── redis-configmap.yaml      # Configuración de Redis
├── redis-pvc.yaml            # PersistentVolumeClaim (1Gi)
├── redis-deployment.yaml     # Deployment con probes
├── redis-service.yaml        # ClusterIP service
├── fx-configmap.yaml         # Variables de entorno para FX
├── fx-secret.yaml            # Secrets (API keys, passwords)
├── fx-deployment.yaml        # Deployment con probes y recursos
└── fx-service.yaml           # ClusterIP service
```

**Características de los manifiestos:**
- ✅ PVC para persistencia de Redis
- ✅ Probes configuradas (liveness y readiness)
- ✅ ConfigMaps para configuración no sensible
- ✅ Secrets para datos sensibles (passwords, API keys)
- ✅ Resource limits y requests
- ✅ Rolling update strategy
- ✅ 2 réplicas de FX para HA

### 3. Configuración

#### Variables de Entorno Soportadas

```bash
# Application
PORT=3001
NODE_ENV=production

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=               # Opcional
REDIS_TTL=3600                # 1 hora

# APIs Externas
FX_PRIMARY_API_URL=https://api.exchangerate-api.com/v4/latest
FX_PRIMARY_API_KEY=           # Opcional
FX_SECONDARY_API_URL=https://api.frankfurter.app/latest
FX_SECONDARY_API_KEY=         # No requerido

# Resiliencia
FX_TIMEOUT=5000
FX_RETRY_ATTEMPTS=3
FX_RETRY_DELAY=1000

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=50
CIRCUIT_BREAKER_TIMEOUT=60000
CIRCUIT_BREAKER_RESET_TIMEOUT=30000
```

## 📝 Cómo Probar Localmente

### Opción 1: Docker Compose (Recomendado)

```bash
# Desde la raíz del proyecto
docker-compose up redis fx

# En otra terminal, probar endpoints
curl http://localhost:3001/fx/health
curl http://localhost:3001/fx/rate?base=USD&quote=GTQ
curl -X POST http://localhost:3001/fx/convert \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "from": "USD", "to": "GTQ"}'
```

### Opción 2: Desarrollo Local

```bash
# 1. Iniciar Redis
docker run -d -p 6379:6379 --name redis redis:7-alpine

# 2. Instalar dependencias
cd services/fx
npm install

# 3. Ejecutar en modo desarrollo
npm run start:dev

# 4. Probar endpoints (igual que arriba)
```

## 🚀 Despliegue en GKE

```bash
# 1. Aplicar Redis
kubectl apply -f k8s/redis-configmap.yaml
kubectl apply -f k8s/redis-pvc.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/redis-service.yaml

# 2. Aplicar FX Service
kubectl apply -f k8s/fx-configmap.yaml
kubectl apply -f k8s/fx-secret.yaml
kubectl apply -f k8s/fx-deployment.yaml
kubectl apply -f k8s/fx-service.yaml

# 3. Verificar
kubectl get pods -n quetzalship
kubectl get svc -n quetzalship

# 4. Ver logs
kubectl logs -n quetzalship -l app=fx -f

# 5. Port-forward para probar
kubectl port-forward -n quetzalship svc/fx 3001:3001
curl http://localhost:3001/fx/health
```

## 📚 Documentación Creada

1. **services/fx/README.md**
   - Descripción completa del servicio
   - Guía de configuración
   - Ejemplos de uso
   - Troubleshooting

2. **services/fx/.env.example**
   - Template de variables de entorno
   - Valores por defecto documentados

## ✅ Checklist de Requerimientos (Sección 3.2.6 del Enunciado)

| Requerimiento | Estado | Implementación |
|---------------|--------|----------------|
| Proveedor externo A | ✅ | exchangerate-api.com con circuit breaker |
| Proveedor externo B (fallback) | ✅ | frankfurter.app con circuit breaker |
| Caché obligatorio con Redis | ✅ | ioredis con TTL configurable |
| Timeout configurable | ✅ | FX_TIMEOUT env var |
| Retries limitados | ✅ | 3 intentos con backoff exponencial |
| Backoff exponencial | ✅ | Implementado (1s, 2s, 4s) |
| Circuit breaker | ✅ | opossum con umbrales configurables |
| Degradación elegante | ✅ | Primary → Secondary → Stale Cache → Error |

## 🔄 Flujo de Degradación Implementado

```
┌─────────────┐
│  Request    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Check Cache │──── Hit? ──→ Return (source: cache)
└──────┬──────┘
       │ Miss
       ▼
┌─────────────────────┐
│ Primary API         │
│ + Circuit Breaker   │──── Success? ──→ Cache + Return (source: primary)
│ + Retry + Backoff   │
└──────┬──────────────┘
       │ Fail
       ▼
┌─────────────────────┐
│ Secondary API       │
│ + Circuit Breaker   │──── Success? ──→ Cache + Return (source: secondary)
│ + Retry + Backoff   │
└──────┬──────────────┘
       │ Fail
       ▼
┌─────────────┐
│ Stale Cache │──── Found? ──→ Return (source: stale-cache)
└──────┬──────┘
       │ Not Found
       ▼
┌─────────────┐
│ Error 503   │
│ Controlled  │
└─────────────┘
```

## 🎯 Próximos Pasos (Para Ti)

1. **Instalar dependencias localmente** (si quieres probar en dev):
   ```bash
   cd services/fx
   npm install
   ```

2. **Probar con Docker Compose**:
   ```bash
   docker-compose up redis fx
   ```

3. **Integrar con Gateway** (si es necesario):
   - El FX service expone puerto 3001
   - Endpoints disponibles en `/fx/*`
   - Puede ser llamado desde otros servicios

4. **Ajustar configuración** según necesidades:
   - Editar `k8s/fx-configmap.yaml` para cambiar timeouts, retries, etc.
   - Editar `docker-compose.yaml` para cambiar env vars localmente

## 📊 Métricas y Observabilidad

El servicio genera logs estructurados para todos los eventos importantes:
- Cache hits/misses
- API calls (success/failure)
- Circuit breaker state changes (open/close/half-open)
- Fallback activations
- Stale cache usage
- Errores con stack traces

Estos logs están listos para ser recolectados por el agente de logs (Fluent Bit/Fluentd) y enviados a ELK.

## 📄 Archivos Modificados/Creados

### Nuevos
- `services/fx/src/config/fx.config.ts`
- `services/fx/src/interfaces/fx.interface.ts`
- `services/fx/src/services/fx.service.ts`
- `services/fx/src/services/redis.service.ts`
- `services/fx/src/services/external-api.service.ts`
- `services/fx/src/controllers/fx.controller.ts`
- `services/fx/Dockerfile`
- `services/fx/.env.example`
- `k8s/redis-*.yaml` (4 archivos)
- `k8s/fx-*.yaml` (4 archivos)

### Modificados
- `services/fx/package.json` (dependencias agregadas)
- `services/fx/src/app.module.ts` (importaciones actualizadas)
- `services/fx/src/main.ts` (configuración mejorada)
- `services/fx/README.md` (documentación completa)
- `docker-compose.yaml` (Redis + FX agregados)

---

**Todo listo para FX Service y Redis según requerimientos de la Práctica 3! 🎉**
