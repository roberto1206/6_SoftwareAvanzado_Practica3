import type { 
  Zone, 
  ServiceType, 
  DiscountType, 
  Package, 
  Discount, 
  CreateOrderRequest,
  Order,
  Breakdown,
  Status
} from '../types/orders';

// Transformar zona a formato backend
function mapZoneToBackend(zone: Zone): string {
  return `ZONE_${zone}`;
}

// Transformar zona desde backend (puede ser número o string)
function mapZoneFromBackend(zone: string | number | undefined): Zone {
  if (zone === undefined || zone === null) {
    return 'METRO'; // Valor por defecto
  }
  if (typeof zone === 'number') {
    // Mapeo de números a zonas
    switch (zone) {
      case 1: return 'METRO';
      case 2: return 'INTERIOR';
      case 3: return 'FRONTERA';
      default: return 'METRO';
    }
  }
  return zone.replace('ZONE_', '') as Zone;
}

// Transformar tipo de servicio a formato backend
function mapServiceTypeToBackend(serviceType: ServiceType): string {
  return `SERVICE_TYPE_${serviceType}`;
}

// Transformar tipo de servicio desde backend (puede ser número o string)
function mapServiceTypeFromBackend(serviceType: string | number | undefined): ServiceType {
  if (serviceType === undefined || serviceType === null) {
    return 'STANDARD'; // Valor por defecto
  }
  if (typeof serviceType === 'number') {
    // Mapeo de números a tipos de servicio
    switch (serviceType) {
      case 1: return 'STANDARD';
      case 2: return 'EXPRESS';
      case 3: return 'SAME_DAY';
      default: return 'STANDARD';
    }
  }
  return serviceType.replace('SERVICE_TYPE_', '') as ServiceType;
}

// Transformar status desde backend (puede ser número o string)
function mapStatusFromBackend(status: string | number | undefined): Status {
  if (status === undefined || status === null) {
    return 'ACTIVE'; // Valor por defecto
  }
  if (typeof status === 'number') {
    // Mapeo de números a status
    switch (status) {
      case 1: return 'ACTIVE';
      case 2: return 'CANCELLED';
      default: return 'ACTIVE';
    }
  }
  return status as Status;
}

// Transformar tipo de descuento a formato backend
function mapDiscountTypeToBackend(discountType: DiscountType): string {
  if (discountType === 'NONE') return 'DISCOUNT_TYPE_NONE';
  return `DISCOUNT_TYPE_${discountType}`;
}

// Transformar tipo de descuento desde backend (puede ser número o string)
function mapDiscountTypeFromBackend(discountType: string | number): DiscountType {
  if (typeof discountType === 'number') {
    // Mapeo de números a tipos de descuento
    switch (discountType) {
      case 0: return 'NONE';
      case 1: return 'PERCENT';
      case 2: return 'FIXED';
      default: return 'NONE';
    }
  }
  const type = discountType.replace('DISCOUNT_TYPE_', '');
  return type as DiscountType;
}

// Transformar paquete a formato backend (snake_case)
function mapPackageToBackend(pkg: Package): any {
  return {
    weight_kg: pkg.weightKg,
    height_cm: pkg.heightCm,
    width_cm: pkg.widthCm,
    length_cm: pkg.lengthCm,
    fragile: pkg.fragile,
    declared_value_q: pkg.declaredValueQ,
  };
}

// Transformar paquete desde backend (camelCase)
function mapPackageFromBackend(pkg: any): Package {
  return {
    weightKg: pkg.weight_kg,
    heightCm: pkg.height_cm,
    widthCm: pkg.width_cm,
    lengthCm: pkg.length_cm,
    fragile: pkg.fragile,
    declaredValueQ: pkg.declared_value_q,
  };
}

// Transformar descuento a formato backend
function mapDiscountToBackend(discount: Discount): any {
  return {
    type: mapDiscountTypeToBackend(discount.type),
    value: discount.value,
  };
}

// Transformar descuento desde backend
function mapDiscountFromBackend(discount: any): Discount {
  return {
    type: mapDiscountTypeFromBackend(discount.type),
    value: discount.value,
  };
}

// Transformar breakdown desde backend
function mapBreakdownFromBackend(breakdown: any): Breakdown {
  return {
    orderBillableKg: breakdown.order_billable_kg,
    baseSubtotal: breakdown.base_subtotal,
    serviceSubtotal: breakdown.service_subtotal,
    fragileSurcharge: breakdown.fragile_surcharge,
    insuranceSurcharge: breakdown.insurance_surcharge,
    subtotalWithSurcharges: breakdown.subtotal_with_surcharges,
    discount: breakdown.discount,
  };
}

// Transformar request de creación a formato backend
export function transformCreateOrderRequestToBackend(request: CreateOrderRequest): any {
  const backendRequest: any = {
    origin_zone: mapZoneToBackend(request.originZone),
    destination_zone: mapZoneToBackend(request.destinationZone),
    service_type: mapServiceTypeToBackend(request.serviceType),
    packages: request.packages.map(mapPackageToBackend),
    insurance_enabled: request.insuranceEnabled,
  };

  if (request.discount && request.discount.type !== 'NONE') {
    backendRequest.discount = mapDiscountToBackend(request.discount);
  }

  return backendRequest;
}

// Transformar timestamp desde backend
function mapTimestampFromBackend(timestamp: any): string {
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  if (timestamp.seconds) {
    const seconds = timestamp.seconds.low || timestamp.seconds;
    return new Date(seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

// Transformar orden desde backend (completa)
export function transformOrderFromBackend(backendOrder: any): Order {
  const order: Order = {
    orderId: backendOrder.order_id,
    createdAt: mapTimestampFromBackend(backendOrder.created_at),
    originZone: mapZoneFromBackend(backendOrder.origin_zone),
    destinationZone: mapZoneFromBackend(backendOrder.destination_zone),
    serviceType: mapServiceTypeFromBackend(backendOrder.service_type),
    packages: backendOrder.packages ? backendOrder.packages.map(mapPackageFromBackend) : [],
    insuranceEnabled: backendOrder.insurance_enabled !== undefined ? backendOrder.insurance_enabled : false,
    status: mapStatusFromBackend(backendOrder.status),
    breakdown: backendOrder.breakdown ? mapBreakdownFromBackend(backendOrder.breakdown) : {
      orderBillableKg: 0,
      baseSubtotal: 0,
      serviceSubtotal: 0,
      fragileSurcharge: 0,
      insuranceSurcharge: 0,
      subtotalWithSurcharges: 0,
      discount: 0,
    },
    total: backendOrder.total || 0,
  };

  if (backendOrder.discount) {
    order.discount = mapDiscountFromBackend(backendOrder.discount);
  }

  return order;
}
