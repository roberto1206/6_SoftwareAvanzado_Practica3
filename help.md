
# Obtener ordenes

## GET http://localhost:3000/v1/orders


# Crear ordenes

## POST http://localhost:3000/v1/orders

## Example 1

## header

```json
{
  "key": "Idempotency-Key",
  "value": "ord-std-001"
}
```

```json
{
  "origin_zone": "ZONE_METRO",
  "destination_zone": "ZONE_FRONTERA",
  "service_type": "SERVICE_TYPE_EXPRESS",
  "packages": [
    {
      "weight_kg": 2.0,
      "height_cm": 40,
      "width_cm": 30,
      "length_cm": 25,
      "fragile": true,
      "declared_value_q": 800
    }
  ],
  "insurance_enabled": true
}
```
## Example 2

## header

```json
{
  "key": "Idempotency-Key",
  "value": "ord-exp-002"
}
```


```json
{
  "origin_zone": "ZONE_METRO",
  "destination_zone": "ZONE_FRONTERA",
  "service_type": "SERVICE_TYPE_EXPRESS",
  "packages": [
    {
      "weight_kg": 2,
      "height_cm": 40,
      "width_cm": 30,
      "length_cm": 25,
      "fragile": true,
      "declared_value_q": 800
    }
  ],
  "insurance_enabled": true
}
```

## Example 3

## header

```json
{
  "key": "Idempotency-Key",
  "value": "ord-multi-003"
}
```


```json
{
  "origin_zone": "ZONE_INTERIOR",
  "destination_zone": "ZONE_METRO",
  "service_type": "SERVICE_TYPE_STANDARD",
  "packages": [
    {
      "weight_kg": 1,
      "height_cm": 20,
      "width_cm": 20,
      "length_cm": 20,
      "fragile": false,
      "declared_value_q": 0
    },
    {
      "weight_kg": 3,
      "height_cm": 50,
      "width_cm": 40,
      "length_cm": 30,
      "fragile": true,
      "declared_value_q": 300
    }
  ],
  "insurance_enabled": false
}
```

## Example 4

## header

```json
{
  "key": "Idempotency-Key",
  "value": "ord-disc-004"
}
```

```json
{
  "origin_zone": "ZONE_METRO",
  "destination_zone": "ZONE_INTERIOR",
  "service_type": "SERVICE_TYPE_STANDARD",
  "packages": [
    {
      "weight_kg": 4,
      "height_cm": 60,
      "width_cm": 40,
      "length_cm": 40,
      "fragile": false,
      "declared_value_q": 200
    }
  ],
  "discount": {
    "type": "DISCOUNT_TYPE_PERCENT",
    "value": 10
  },
  "insurance_enabled": true
}
```


## Example 5

## header

```json
{
  "key": "Idempotency-Key",
  "value": "ord-disc-005"
}
```

```json
{
  "origin_zone": "ZONE_METRO",
  "destination_zone": "ZONE_INTERIOR",
  "service_type": "SERVICE_TYPE_STANDARD",
  "packages": [
    {
      "weight_kg": 4,
      "height_cm": 60,
      "width_cm": 40,
      "length_cm": 40,
      "fragile": false,
      "declared_value_q": 200
    }
  ],
  "discount": {
    "type": "DISCOUNT_TYPE_FIXED",
    "value": 25
  },
  "insurance_enabled": false
}
```

# Cancelar ordenes

## DELETE http://localhost:3000/v1/orders/{ORDER_ID}/cancel

# Obtener por orden

## GET http://localhost:3000/v1/orders/{ORDER_ID}