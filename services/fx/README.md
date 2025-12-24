# FX Service - Exchange Rate Service

## Descripción

Servicio de conversión de divisas para Quetzal Ship con alta disponibilidad, resiliencia y caché.

## Características Implementadas

### ✅ Resiliencia Completa

1. **Proveedor Principal (Primary API)**
   - API: exchangerate-api.com
   - Timeout configurable
   - Retry con backoff exponencial
   - Circuit breaker

2. **Proveedor Secundario (Fallback)**
   - API: frankfurter.app
   - Se activa cuando falla el proveedor principal
   - Mismas características de resiliencia

3. **Caché con Redis**
   - TTL configurable (default: 1 hora)
   - Formato de clave: `fx:BASE:QUOTE`
   - Soporte para datos stale como último recurso

4. **Degradación Elegante**
   ```
   1. Intenta caché → si existe, retorna
   2. Intenta API principal → si funciona, cachea y retorna
   3. Intenta API secundaria → si funciona, cachea y retorna
   4. Intenta caché stale → si existe, retorna con advertencia
   5. Retorna error 503 con mensaje descriptivo
   ```

5. **Circuit Breaker**
   - Configuración independiente por proveedor
   - Umbrales configurables
   - Estados: closed, open, half-open
   - Métricas disponibles en `/fx/health`

### 📡 Endpoints

#### GET /fx/health
Health check del servicio incluyendo estado de Redis y circuit breakers.

**Response:**
```json
{
  "status": "healthy",
  "redis": "connected",
  "circuitBreakers": {
    "primary": {
      "state": "closed",
      "stats": {...}
    },
    "secondary": {
      "state": "closed",
      "stats": {...}
    }
  },
  "timestamp": "2025-12-23T..."
}
```

#### GET /fx/rate?base=USD&quote=GTQ
Obtiene el tipo de cambio entre dos monedas.

**Parameters:**
- `base`: Moneda base (ej. USD, EUR, GTQ)
- `quote`: Moneda destino (ej. GTQ, USD, MXN)

**Response:**
```json
{
  "base": "USD",
  "quote": "GTQ",
  "rate": 7.75,
  "timestamp": "2025-12-23T...",
  "source": "cache|primary|secondary|stale-cache"
}
```

#### POST /fx/convert
Convierte un monto de una moneda a otra.

**Request Body:**
```json
{
  "amount": 100,
  "from": "USD",
  "to": "GTQ"
}
```

**Response:**
```json
{
  "originalAmount": 100,
  "convertedAmount": 775.00,
  "from": "USD",
  "to": "GTQ",
  "rate": 7.75,
  "timestamp": "2025-12-23T...",
  "source": "cache|primary|secondary|stale-cache"
}
```

## Configuración

### Variables de Entorno

```bash
# Application
PORT=3001
NODE_ENV=production

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TTL=3600                    # TTL en segundos (1 hora)

# Primary API
FX_PRIMARY_API_URL=https://api.exchangerate-api.com/v4/latest
FX_PRIMARY_API_KEY=               # Opcional

# Secondary API  
FX_SECONDARY_API_URL=https://api.frankfurter.app/latest
FX_SECONDARY_API_KEY=             # Opcional

# Resilience
FX_TIMEOUT=5000                   # Timeout en ms
FX_RETRY_ATTEMPTS=3               # Número de reintentos
FX_RETRY_DELAY=1000               # Delay inicial para backoff (ms)

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=50      # % de errores para abrir circuito
CIRCUIT_BREAKER_TIMEOUT=60000     # Timeout antes de intentar cerrar (ms)
CIRCUIT_BREAKER_RESET_TIMEOUT=30000 # Timeout para resetear contador de errores (ms)
```

## Ejecución Local

### Con Docker Compose

```bash
# Desde la raíz del proyecto
docker-compose up redis fx

# Verificar salud
curl http://localhost:3001/fx/health

# Probar conversión
curl http://localhost:3001/fx/rate?base=USD&quote=GTQ

curl -X POST http://localhost:3001/fx/convert \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "from": "USD", "to": "GTQ"}'
```

### Desarrollo

```bash
cd services/fx

# Instalar dependencias
npm install

# Iniciar Redis (necesario)
docker run -d -p 6379:6379 redis:7-alpine

# Configurar variables de entorno
export REDIS_HOST=localhost
export REDIS_PORT=6379

# Ejecutar en modo desarrollo
npm run start:dev

# Ejecutar tests
npm test

# Build
npm run build

# Ejecutar en producción
npm run start:prod
```

## Despliegue en Kubernetes

### 1. Aplicar manifiestos de Redis

```bash
kubectl apply -f k8s/redis-configmap.yaml
kubectl apply -f k8s/redis-pvc.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/redis-service.yaml
```

### 2. Aplicar manifiestos de FX

```bash
kubectl apply -f k8s/fx-configmap.yaml
kubectl apply -f k8s/fx-secret.yaml
kubectl apply -f k8s/fx-deployment.yaml
kubectl apply -f k8s/fx-service.yaml
```

### 3. Verificar despliegue

```bash
# Ver pods
kubectl get pods -n quetzalship -l app=fx
kubectl get pods -n quetzalship -l app=redis

# Ver logs
kubectl logs -n quetzalship -l app=fx --tail=100 -f

# Port-forward para pruebas
kubectl port-forward -n quetzalship svc/fx 3001:3001

# Probar
curl http://localhost:3001/fx/health
```

## Arquitectura de Resiliencia

```
Request
   ↓
[Check Cache]
   ↓ (miss)
[Primary API + Circuit Breaker]
   ↓ (timeout/retry/backoff)
[Secondary API + Circuit Breaker]
   ↓ (timeout/retry/backoff)
[Stale Cache]
   ↓ (not found)
[Error 503]
```

### Flujo de Retry con Backoff Exponencial

```
Attempt 1: delay = 1000ms * 2^0 = 1000ms
Attempt 2: delay = 1000ms * 2^1 = 2000ms
Attempt 3: delay = 1000ms * 2^2 = 4000ms
```

### Estados del Circuit Breaker

- **Closed**: Operación normal, todas las requests pasan
- **Open**: Circuito abierto por muchos errores, rechaza requests sin intentar
- **Half-Open**: Intenta una request de prueba para ver si recuperó

## Pruebas

### Probar Caché

```bash
# Primera llamada (caché miss, llama API)
curl http://localhost:3001/fx/rate?base=USD&quote=GTQ
# Response: "source": "primary"

# Segunda llamada inmediata (caché hit)
curl http://localhost:3001/fx/rate?base=USD&quote=GTQ
# Response: "source": "cache"
```

### Probar Fallback

```bash
# Simular fallo de primary API (configurar URL inválida)
# La secondary API tomará el control automáticamente
```

### Probar Degradación con Stale Cache

```bash
# 1. Hacer una llamada para cachear
curl http://localhost:3001/fx/rate?base=USD&quote=GTQ

# 2. Apagar Redis temporalmente
docker stop quetzalship-redis

# 3. Intentar llamada nuevamente
# Debería fallar con error controlado

# 4. Reiniciar Redis
docker start quetzalship-redis
```

## Dependencias Principales

- **NestJS**: Framework
- **ioredis**: Cliente de Redis con soporte completo
- **axios**: Cliente HTTP para llamadas a APIs externas
- **opossum**: Implementación de Circuit Breaker
- **@nestjs/config**: Gestión de configuración

## Logs y Monitoreo

El servicio genera logs estructurados para observabilidad:

```json
{
  "level": "log",
  "message": "Getting exchange rate: USD/GTQ",
  "context": "FxService"
}
```

Eventos importantes logueados:
- Cache hits/misses
- API calls (success/failure)
- Circuit breaker state changes
- Fallback activations
- Stale cache usage
- Errors con stack traces

## Troubleshooting

### Redis no conecta

```bash
# Verificar que Redis esté corriendo
docker ps | grep redis

# Ver logs de Redis
docker logs quetzalship-redis

# Probar conexión manual
redis-cli -h localhost -p 6379 ping
```

### APIs externas fallan

```bash
# Verificar conectividad
curl https://api.exchangerate-api.com/v4/latest/USD
curl https://api.frankfurter.app/latest?from=USD&to=GTQ

# Revisar estado del circuit breaker
curl http://localhost:3001/fx/health
```

### Circuit breaker siempre abierto

- Verificar umbrales de configuración
- Revisar logs para ver errores recurrentes
- Aumentar `CIRCUIT_BREAKER_RESET_TIMEOUT` si es necesario
