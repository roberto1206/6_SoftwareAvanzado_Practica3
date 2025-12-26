# FX Service con gRPC - Resumen de Implementación

## ✅ Cambios Realizados

### 1. Proto Definition (`contracts/proto/fx/fx.proto`)
- ✅ Definido servicio `FxService` con 3 métodos gRPC:
  - `GetExchangeRate`: Obtener tasa de cambio
  - `ConvertAmount`: Convertir monto entre divisas
  - `HealthCheck`: Verificar estado del servicio
- ✅ Mensajes de request/response definidos
- Package: `quetzalship.fx.v1`

### 2. Dependencias Agregadas (`services/fx/package.json`)
```json
"@grpc/grpc-js": "^1.9.13",
"@grpc/proto-loader": "^0.7.10",
"@nestjs/microservices": "^10.0.0"
```

### 3. Controlador gRPC (`services/fx/src/controllers/fx.grpc.controller.ts`)
- ✅ Implementa los 3 métodos del proto
- ✅ Usa decoradores `@GrpcMethod`
- ✅ Reutiliza la lógica de `FxService` (sin duplicar código)

### 4. Main Bootstrap (`services/fx/src/main.ts`)
- ✅ Aplicación **HÍBRIDA**: HTTP + gRPC
- ✅ HTTP en puerto `3001` (REST endpoints)
- ✅ gRPC en puerto `50055` (para Gateway)

### 5. Dockerfile Actualizado
- ✅ Copia `contracts/` al contenedor (necesario para proto en runtime)
- ✅ Expone 2 puertos: `3001` (HTTP) y `50055` (gRPC)

### 6. Docker Compose
- ✅ Servicio `redis` agregado
- ✅ Servicio `fx` depende de `redis`
- ✅ Puerto gRPC `50055` expuesto internamente

### 7. Cliente gRPC para Gateway (`services/gateway/src/grpc/fx.client.ts`)
- ✅ Cliente ejemplo para consumir FX desde Gateway
- ✅ Usa la variable `FX_SERVICE_URL` (default: `fx:50055`)

## 🔧 Configuración Necesaria

### FX Service `.env`
```env
# HTTP
PORT=3001

# Redis (VM Remota)
REDIS_HOST=34.30.195.87
REDIS_PORT=6379
REDIS_TTL=3600

# APIs Externas
FX_PRIMARY_API_URL=https://api.exchangerate-api.com/v4/latest
FX_SECONDARY_API_URL=https://api.frankfurter.app/latest
FX_TIMEOUT=5000
FX_RETRY_ATTEMPTS=3
FX_RETRY_DELAY=1000

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD=50
CIRCUIT_BREAKER_TIMEOUT=60000
CIRCUIT_BREAKER_RESET_TIMEOUT=30000
```

### Gateway `.env` (agregar)
```env
# FX Service (gRPC)
FX_SERVICE_URL=fx:50055
```

## 🚀 Cómo Probar

### 1. Levantar servicios
```bash
docker-compose up -d redis fx
```

### 2. Verificar logs
```bash
docker logs quetzalship-fx
```

Deberías ver:
```
FX Service running on:
  - HTTP: http://localhost:3001
  - gRPC: localhost:50055
Health endpoint: http://localhost:3001/fx/health
```

### 3. Probar HTTP (aún funciona)
```bash
curl http://localhost:3001/fx/health
```

### 4. Integrar con Gateway
El Gateway puede usar el cliente gRPC:

```typescript
import { FxGrpcClient } from './grpc/fx.client';

// En tu controlador
@Controller()
export class OrdersController {
  constructor(private fxClient: FxGrpcClient) {}

  @Post('convert')
  async convert() {
    const result = await this.fxClient.convertAmount('USD', 'MXN', 100).toPromise();
    return result;
  }
}
```

## 📊 Puertos Asignados

| Servicio | HTTP | gRPC |
|----------|------|------|
| Gateway  | 3000 | -    |
| Orders   | -    | 50053|
| Pricing  | -    | 50052|
| Receipt  | -    | 50054|
| **FX**   | 3001 | **50055** |

## ✨ Ventajas de gRPC

1. **Performance**: Binario en vez de JSON
2. **Type Safety**: Contratos definidos en proto
3. **Streaming**: Soporta streams bidireccionales (futuro)
4. **Multiplexing**: Múltiples requests en 1 conexión

## 📝 Siguiente Paso

1. ✅ Levanta Docker Desktop
2. ✅ Reconstruye la imagen: `docker-compose build fx`
3. ✅ Levanta los servicios: `docker-compose up -d redis fx`
4. ✅ Integra el cliente en Gateway
5. ✅ Prueba desde Gateway → FX (gRPC)

## 🎯 Resultado Final

```
Client (Frontend)
    ↓ HTTP
Gateway (REST API)
    ↓ gRPC ← NUEVA COMUNICACIÓN
FX Service (Híbrido: REST + gRPC)
    ↓
Redis (Cache)
    ↓
External APIs (exchangerate-api, frankfurter)
```

¡FX ahora habla gRPC con el Gateway! 🚀
