import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

// Enums con los valores numéricos del proto
enum Zone {
  ZONE_UNSPECIFIED = 0,
  ZONE_METRO = 1,
  ZONE_INTERIOR = 2,
  ZONE_FRONTERA = 3,
}

enum ServiceType {
  SERVICE_TYPE_UNSPECIFIED = 0,
  SERVICE_TYPE_STANDARD = 1,
  SERVICE_TYPE_EXPRESS = 2,
  SERVICE_TYPE_SAME_DAY = 3,
}

enum DiscountType {
  DISCOUNT_TYPE_UNSPECIFIED = 0,
  DISCOUNT_TYPE_NONE = 1,
  DISCOUNT_TYPE_PERCENT = 2,
  DISCOUNT_TYPE_FIXED = 3,
}

interface PackageInput {
  weight_kg: number;
  height_cm: number;
  width_cm: number;
  length_cm: number;
  fragile: boolean;
  declared_value_q: number;
}

interface DiscountInput {
  type: DiscountType;
  value: number;
}

interface CalculatePricingRequest {
  origin_zone: Zone;
  destination_zone: Zone;
  service_type: ServiceType;
  packages: PackageInput[];
  discount?: DiscountInput;
  insurance_enabled: boolean;
}

@Controller()
export class PricingController {
  @GrpcMethod('PricingService', 'CalculatePricing')
  calculatePricing(req: CalculatePricingRequest) {
    // Validaciones mínimas
    if (!req.packages || req.packages.length < 1) {
      throw new Error('packages debe tener al menos 1 elemento');
    }

    for (const [i, p] of req.packages.entries()) {
      if (p.weight_kg <= 0)
        throw new Error(`packages[${i}].weight_kg debe ser > 0`);
      if (p.height_cm <= 0)
        throw new Error(`packages[${i}].height_cm debe ser > 0`);
      if (p.width_cm <= 0)
        throw new Error(`packages[${i}].width_cm debe ser > 0`);
      if (p.length_cm <= 0)
        throw new Error(`packages[${i}].length_cm debe ser > 0`);
      if (p.declared_value_q < 0)
        throw new Error(`packages[${i}].declared_value_q debe ser >= 0`);
    }

    const declaredSum = req.packages.reduce(
      (acc, p) => acc + (p.declared_value_q ?? 0),
      0,
    );
    if (req.insurance_enabled && declaredSum <= 0) {
      throw new Error(
        'insurance_enabled=true requiere sum(declared_value_q) > 0',
      );
    }

    // 1) volumetricKg = (h*w*l)/5000
    // 2) billableKg = max(weightKg, volumetricKg)
    const billables = req.packages.map((p) => {
      const volumetric = (p.height_cm * p.width_cm * p.length_cm) / 5000;
      return Math.max(p.weight_kg, volumetric);
    });

    // 3) orderBillableKg = sum(billableKg)
    const orderBillableKg = billables.reduce((a, b) => a + b, 0);

    // 4) rate by destination zone (usando números)
    const rate =
      req.destination_zone === Zone.ZONE_METRO
        ? 8
        : req.destination_zone === Zone.ZONE_INTERIOR
          ? 12
          : req.destination_zone === Zone.ZONE_FRONTERA
            ? 16
            : 0;

    if (rate === 0) throw new Error('destination_zone inválida');

    // 5) baseSubtotal
    const baseSubtotal = orderBillableKg * rate;

    // 6) multiplier by service type (usando números)
    const multiplier =
      req.service_type === ServiceType.SERVICE_TYPE_STANDARD
        ? 1.0
        : req.service_type === ServiceType.SERVICE_TYPE_EXPRESS
          ? 1.35
          : req.service_type === ServiceType.SERVICE_TYPE_SAME_DAY
            ? 1.8
            : 0;

    if (multiplier === 0) throw new Error('service_type inválido');

    const serviceSubtotal = baseSubtotal * multiplier;

    // 7) surcharges
    const fragileCount = req.packages.filter((p) => p.fragile).length;
    const fragileSurcharge = fragileCount * 7;

    const insuranceSurcharge = req.insurance_enabled ? 0.025 * declaredSum : 0;

    const subtotalWithSurcharges =
      serviceSubtotal + fragileSurcharge + insuranceSurcharge;

    // 8) discount
    let discountAmount = 0;
    const d = req.discount;

    if (d && d.type && d.type !== DiscountType.DISCOUNT_TYPE_NONE) {
      if (d.type === DiscountType.DISCOUNT_TYPE_PERCENT) {
        if (d.value > 35)
          throw new Error('discount percent inválido: value > 35');
        if (d.value < 0)
          throw new Error('discount percent inválido: value < 0');
        discountAmount = (d.value / 100) * subtotalWithSurcharges;
      } else if (d.type === DiscountType.DISCOUNT_TYPE_FIXED) {
        if (d.value < 0) throw new Error('discount fixed inválido: value < 0');
        discountAmount = d.value;
      } else {
        // si viene UNSPECIFIED, tratamos como NONE
        discountAmount = 0;
      }
    }

    // fixed: piso 0.00
    let total = subtotalWithSurcharges - discountAmount;
    if (total < 0) total = 0;

    // 9) redondeo a 2 decimales
    const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

    const breakdown = {
      order_billable_kg: round2(orderBillableKg),
      base_subtotal: round2(baseSubtotal),
      service_subtotal: round2(serviceSubtotal),
      fragile_surcharge: round2(fragileSurcharge),
      insurance_surcharge: round2(insuranceSurcharge),
      subtotal_with_surcharges: round2(subtotalWithSurcharges),
      discount_amount: round2(discountAmount),
      total: round2(total),
    };

    return {
      breakdown,
      total: breakdown.total,
    };
  }
}
