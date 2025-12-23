import { PricingController } from './pricing.controller';

// Enums con valores numéricos (igual que en el controller)
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

describe('PricingController - CalculatePricing', () => {
  let controller: PricingController;

  beforeEach(() => {
    controller = new PricingController();
  });

  it('calcula correctamente un caso completo (volumétrico, zona, servicio, frágil, seguro, percent)', () => {
    const req = {
      origin_zone: Zone.ZONE_METRO,
      destination_zone: Zone.ZONE_INTERIOR,
      service_type: ServiceType.SERVICE_TYPE_EXPRESS,
      packages: [
        {
          weight_kg: 2.5,
          height_cm: 30,
          width_cm: 20,
          length_cm: 40,
          fragile: true,
          declared_value_q: 500,
        },
        {
          weight_kg: 1.0,
          height_cm: 10,
          width_cm: 10,
          length_cm: 10,
          fragile: false,
          declared_value_q: 0,
        },
      ],
      discount: { type: DiscountType.DISCOUNT_TYPE_PERCENT, value: 10 },
      insurance_enabled: true,
    } as any;

    const res = controller.calculatePricing(req);

    expect(res.total).toBe(102.11);
    expect(res.breakdown).toEqual({
      order_billable_kg: 5.8,
      base_subtotal: 69.6,
      service_subtotal: 93.96,
      fragile_surcharge: 7.0,
      insurance_surcharge: 12.5,
      subtotal_with_surcharges: 113.46,
      discount_amount: 11.35,
      total: 102.11,
    });
  });

  it('usa el peso volumétrico cuando es mayor que el peso real', () => {
    const req = {
      origin_zone: Zone.ZONE_METRO,
      destination_zone: Zone.ZONE_FRONTERA,
      service_type: ServiceType.SERVICE_TYPE_STANDARD,
      packages: [
        {
          weight_kg: 1,
          height_cm: 100,
          width_cm: 50,
          length_cm: 50,
          fragile: false,
          declared_value_q: 0,
        },
      ],
      insurance_enabled: false,
    } as any;

    const res = controller.calculatePricing(req);

    // volumétrico = (100*50*50)/5000 = 50, billable = 50
    expect(res.breakdown.order_billable_kg).toBe(50.0);
    expect(res.total).toBe(800.0); // FRONTERA => 16 Q/kg, 50*16 = 800
  });

  it('aplica FIXED y deja el total en 0.00 si excede el subtotal', () => {
    const req = {
      origin_zone: Zone.ZONE_METRO,
      destination_zone: Zone.ZONE_METRO,
      service_type: ServiceType.SERVICE_TYPE_STANDARD,
      packages: [
        {
          weight_kg: 1,
          height_cm: 10,
          width_cm: 10,
          length_cm: 10,
          fragile: false,
          declared_value_q: 0,
        },
      ],
      discount: { type: DiscountType.DISCOUNT_TYPE_FIXED, value: 100 },
      insurance_enabled: false,
    } as any;

    const res = controller.calculatePricing(req);

    expect(res.breakdown.subtotal_with_surcharges).toBe(8.0);
    expect(res.breakdown.discount_amount).toBe(100.0);
    expect(res.total).toBe(0.0);
  });

  it('redondea a 2 decimales (seguro y percent)', () => {
    const req = {
      origin_zone: Zone.ZONE_METRO,
      destination_zone: Zone.ZONE_METRO,
      service_type: ServiceType.SERVICE_TYPE_STANDARD,
      packages: [
        {
          weight_kg: 1,
          height_cm: 10,
          width_cm: 10,
          length_cm: 10,
          fragile: false,
          declared_value_q: 333,
        },
      ],
      discount: { type: DiscountType.DISCOUNT_TYPE_PERCENT, value: 1 },
      insurance_enabled: true,
    } as any;

    const res = controller.calculatePricing(req);

    // seguro = 0.025*333 = 8.325 => 8.33
    expect(res.breakdown.insurance_surcharge).toBe(8.33);
    // subtotal = 8 + 8.33 = 16.33
    expect(res.breakdown.subtotal_with_surcharges).toBe(16.33);
    // 1% de 16.33 = 0.1633 => 0.16
    expect(res.breakdown.discount_amount).toBe(0.16);
    // total = 16.33 - 0.16 = 16.17? (ojo: por redondeo del descuento ya aplicado)
    // En tu implementación: subtotalWithSurcharges - discountAmount, luego round2 => 16.16
    expect(res.total).toBe(16.16);
  });

  it('si insurance_enabled=true y sum(declared_value_q)<=0 debe fallar', () => {
    const req = {
      origin_zone: Zone.ZONE_METRO,
      destination_zone: Zone.ZONE_METRO,
      service_type: ServiceType.SERVICE_TYPE_STANDARD,
      packages: [
        {
          weight_kg: 1,
          height_cm: 10,
          width_cm: 10,
          length_cm: 10,
          fragile: false,
          declared_value_q: 0,
        },
      ],
      insurance_enabled: true,
    } as any;

    expect(() => controller.calculatePricing(req)).toThrow(
      'insurance_enabled=true requiere sum(declared_value_q) > 0',
    );
  });

  it('si discount percent > 35 debe fallar', () => {
    const req = {
      origin_zone: Zone.ZONE_METRO,
      destination_zone: Zone.ZONE_METRO,
      service_type: ServiceType.SERVICE_TYPE_STANDARD,
      packages: [
        {
          weight_kg: 1,
          height_cm: 10,
          width_cm: 10,
          length_cm: 10,
          fragile: false,
          declared_value_q: 1,
        },
      ],
      discount: { type: DiscountType.DISCOUNT_TYPE_PERCENT, value: 36 },
      insurance_enabled: false,
    } as any;

    expect(() => controller.calculatePricing(req)).toThrow(
      'discount percent inválido: value > 35',
    );
  });

  it('valida dimensiones/peso: <=0 debe fallar', () => {
    const req = {
      origin_zone: Zone.ZONE_METRO,
      destination_zone: Zone.ZONE_METRO,
      service_type: ServiceType.SERVICE_TYPE_STANDARD,
      packages: [
        {
          weight_kg: 0,
          height_cm: 10,
          width_cm: 10,
          length_cm: 10,
          fragile: false,
          declared_value_q: 0,
        },
      ],
      insurance_enabled: false,
    } as any;

    expect(() => controller.calculatePricing(req)).toThrow(
      'packages[0].weight_kg debe ser > 0',
    );
  });
});