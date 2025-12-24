# Comandos Útiles para FX Service y Redis

## 🚀 Inicio Rápido

### Docker Compose - Levantar servicios

```bash
# Solo Redis
docker-compose up -d redis

# Solo FX
docker-compose up -d fx

# Ambos
docker-compose up -d redis fx

# Ver logs en tiempo real
docker-compose logs -f fx
docker-compose logs -f redis
```

### Verificar que estén corriendo

```bash
docker ps

# Deberías ver:
# - quetzalship-redis
# - quetzalship-fx
```

## 🧪 Pruebas Locales

### 1. Health Check

```bash
# Verificar salud del servicio
curl http://localhost:3001/fx/health

# Response esperado:
{
  "status": "healthy",
  "redis": "connected",
  "circuitBreakers": {
    "primary": { "state": "closed", "stats": {...} },
    "secondary": { "state": "closed", "stats": {...} }
  },
  "timestamp": "2025-12-23T..."
}
```

### 2. Obtener Tipo de Cambio

```bash
# USD a GTQ
curl "http://localhost:3001/fx/rate?base=USD&quote=GTQ"

# GTQ a USD
curl "http://localhost:3001/fx/rate?base=GTQ&quote=USD"

# EUR a GTQ
curl "http://localhost:3001/fx/rate?base=EUR&quote=GTQ"

# Response esperado:
{
  "base": "USD",
  "quote": "GTQ",
  "rate": 7.75,
  "timestamp": "2025-12-23T...",
  "source": "cache" | "primary" | "secondary" | "stale-cache"
}
```

### 3. Convertir Monto

```bash
# Convertir 100 USD a GTQ
curl -X POST http://localhost:3001/fx/convert \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "from": "USD",
    "to": "GTQ"
  }'

# Convertir 1000 GTQ a USD
curl -X POST http://localhost:3001/fx/convert \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 1000,
    "from": "GTQ",
    "to": "USD"
  }'

# Response esperado:
{
  "originalAmount": 100,
  "convertedAmount": 775.00,
  "from": "USD",
  "to": "GTQ",
  "rate": 7.75,
  "timestamp": "2025-12-23T...",
  "source": "primary"
}
```

## 🔍 Verificar Caché Redis

### Ver datos en Redis

```bash
# Conectarse a Redis
docker exec -it quetzalship-redis redis-cli

# Dentro de redis-cli:
KEYS fx:*                    # Ver todas las claves de FX
GET fx:USD:GTQ               # Ver tasa específica
TTL fx:USD:GTQ               # Ver tiempo restante de TTL
FLUSHALL                     # Limpiar todo (CUIDADO!)
exit
```

### Probar que caché funciona

```bash
# Primera llamada (debería llamar a API externa)
curl "http://localhost:3001/fx/rate?base=USD&quote=GTQ"
# source: "primary"

# Segunda llamada (debería usar caché)
curl "http://localhost:3001/fx/rate?base=USD&quote=GTQ"
# source: "cache"
```

## 🛠️ Desarrollo Local (sin Docker)

### Instalar y correr

```bash
# 1. Iniciar Redis
docker run -d -p 6379:6379 --name redis redis:7-alpine

# 2. Ir al directorio FX
cd services/fx

# 3. Instalar dependencias
npm install

# 4. Copiar variables de entorno
cp .env.example .env

# 5. Ejecutar en modo desarrollo
npm run start:dev

# El servicio estará en http://localhost:3001
```

### Comandos de desarrollo

```bash
# Compilar
npm run build

# Correr tests
npm test

# Lint
npm run lint

# Formatear código
npm run format

# Modo producción
npm run start:prod
```

## ☸️ Kubernetes / GKE

### Aplicar manifiestos

```bash
# Crear namespace (si no existe)
kubectl create namespace quetzalship

# Aplicar Redis
kubectl apply -f k8s/redis-configmap.yaml
kubectl apply -f k8s/redis-pvc.yaml
kubectl apply -f k8s/redis-deployment.yaml
kubectl apply -f k8s/redis-service.yaml

# Aplicar FX Service
kubectl apply -f k8s/fx-configmap.yaml
kubectl apply -f k8s/fx-secret.yaml
kubectl apply -f k8s/fx-deployment.yaml
kubectl apply -f k8s/fx-service.yaml

# O aplicar todos a la vez
kubectl apply -f k8s/
```

### Verificar despliegue

```bash
# Ver todos los recursos
kubectl get all -n quetzalship

# Ver pods específicos
kubectl get pods -n quetzalship -l app=fx
kubectl get pods -n quetzalship -l app=redis

# Ver servicios
kubectl get svc -n quetzalship

# Ver ConfigMaps y Secrets
kubectl get configmap -n quetzalship
kubectl get secret -n quetzalship

# Ver PVC
kubectl get pvc -n quetzalship
```

### Ver logs

```bash
# Logs de FX (todos los pods)
kubectl logs -n quetzalship -l app=fx --tail=100 -f

# Logs de un pod específico
kubectl logs -n quetzalship fx-xxxxxxxxxx-xxxxx -f

# Logs de Redis
kubectl logs -n quetzalship -l app=redis -f

# Logs anteriores (si crasheó)
kubectl logs -n quetzalship fx-xxxxxxxxxx-xxxxx --previous
```

### Debugging

```bash
# Describir pod para ver eventos
kubectl describe pod -n quetzalship fx-xxxxxxxxxx-xxxxx

# Ver probes
kubectl describe pod -n quetzalship fx-xxxxxxxxxx-xxxxx | grep -A 10 "Liveness\|Readiness"

# Ejecutar comando dentro del pod
kubectl exec -it -n quetzalship fx-xxxxxxxxxx-xxxxx -- /bin/sh

# Ver variables de entorno
kubectl exec -n quetzalship fx-xxxxxxxxxx-xxxxx -- env | grep -E 'REDIS|FX_'
```

### Port-forward para pruebas

```bash
# Forward FX service
kubectl port-forward -n quetzalship svc/fx 3001:3001

# Forward Redis (para inspeccionar)
kubectl port-forward -n quetzalship svc/redis 6379:6379

# En otra terminal, probar
curl http://localhost:3001/fx/health
redis-cli -h localhost -p 6379 ping
```

### Rollout y Rollback

```bash
# Ver historial de despliegues
kubectl rollout history deployment/fx -n quetzalship

# Ver estado actual
kubectl rollout status deployment/fx -n quetzalship

# Revertir al despliegue anterior
kubectl rollout undo deployment/fx -n quetzalship

# Revertir a una revisión específica
kubectl rollout undo deployment/fx -n quetzalship --to-revision=2

# Pausar rollout
kubectl rollout pause deployment/fx -n quetzalship

# Resumir rollout
kubectl rollout resume deployment/fx -n quetzalship

# Reiniciar pods
kubectl rollout restart deployment/fx -n quetzalship
```

## 🧹 Limpieza

### Docker Compose

```bash
# Detener servicios
docker-compose stop fx redis

# Eliminar contenedores
docker-compose rm -f fx redis

# Eliminar volúmenes (CUIDADO: borra datos)
docker-compose down -v
```

### Kubernetes

```bash
# Eliminar FX
kubectl delete -f k8s/fx-deployment.yaml
kubectl delete -f k8s/fx-service.yaml
kubectl delete -f k8s/fx-configmap.yaml
kubectl delete -f k8s/fx-secret.yaml

# Eliminar Redis
kubectl delete -f k8s/redis-deployment.yaml
kubectl delete -f k8s/redis-service.yaml
kubectl delete -f k8s/redis-configmap.yaml
kubectl delete -f k8s/redis-pvc.yaml

# O eliminar todo
kubectl delete -f k8s/
```

## 🐛 Troubleshooting

### FX no puede conectar a Redis

```bash
# Ver logs del servicio
docker-compose logs fx

# Verificar que Redis esté corriendo
docker ps | grep redis

# Verificar network
docker-compose exec fx ping redis

# En Kubernetes
kubectl logs -n quetzalship -l app=fx | grep -i redis
kubectl exec -n quetzalship fx-xxxxx -- nc -zv redis 6379
```

### Circuit breaker siempre abierto

```bash
# Ver estado actual
curl http://localhost:3001/fx/health

# Ver logs para errores
docker-compose logs fx | grep -i "circuit\|error"

# Reiniciar servicio
docker-compose restart fx
```

### APIs externas no responden

```bash
# Probar manualmente
curl https://api.exchangerate-api.com/v4/latest/USD
curl https://api.frankfurter.app/latest?from=USD&to=GTQ

# Ver logs del servicio
docker-compose logs fx | grep -i "api\|external"
```

## 📊 Monitoreo

### Ver métricas de circuit breaker

```bash
# Health endpoint incluye métricas
curl http://localhost:3001/fx/health | jq '.circuitBreakers'
```

### Ver uso de caché

```bash
# Conectar a Redis y ver stats
docker exec -it quetzalship-redis redis-cli INFO stats
docker exec -it quetzalship-redis redis-cli INFO memory
```

## 🔐 Build de imagen Docker (para CI/CD)

```bash
# Desde la raíz del proyecto
docker build -f services/fx/Dockerfile -t quetzalship-fx:latest .

# Tag para registry
docker tag quetzalship-fx:latest gcr.io/PROJECT_ID/quetzalship-fx:v1.0.0

# Push a registry
docker push gcr.io/PROJECT_ID/quetzalship-fx:v1.0.0
```

---

**Tip**: Guarda este archivo en tus favoritos para acceso rápido a comandos! 🚀
