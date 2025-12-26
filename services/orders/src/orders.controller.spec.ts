import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PricingClient } from './pricing.client';
import { RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { OrderStatus, Zone, ServiceType } from './entities/order.entity';

function getRpcError(e: any) {
  if (e instanceof RpcException) return e.getError();
  return e;
}

describe('OrdersController', () => {
  let controller: OrdersController;

  let pricing: { calculatePricing: jest.Mock };
  let service: {
    createId: jest.Mock;
    getByIdempotencyKey: jest.Mock;
    saveIdempotencyKey: jest.Mock;
    get: jest.Mock;
    save: jest.Mock;
    cancel: jest.Mock;
    list: jest.Mock;
  };

  const FIXED_DATE = new Date('2023-11-14T00:00:00.000Z');

  const makeOrder = (overrides: Partial<any> = {}) => ({
    order_id: overrides.order_id ?? 'ORD-TEST-1',
    created_at: overrides.created_at ?? FIXED_DATE,
    status: overrides.status ?? OrderStatus.ACTIVE, // ✅ NUMÉRICO (1/2)

    origin_zone: overrides.origin_zone ?? Zone.METRO,
    destination_zone: overrides.destination_zone ?? Zone.INTERIOR,
    service_type: overrides.service_type ?? ServiceType.STANDARD,

    insurance_enabled: overrides.insurance_enabled ?? false,

    discount_type: overrides.discount_type ?? undefined,
    discount_value: overrides.discount_value ?? undefined,

    order_billable_kg: overrides.order_billable_kg ?? 1,
    base_subtotal: overrides.base_subtotal ?? 10,
    service_subtotal: overrides.service_subtotal ?? 5,
    fragile_surcharge: overrides.fragile_surcharge ?? 0,
    insurance_surcharge: overrides.insurance_surcharge ?? 0,
    subtotal_with_surcharges: overrides.subtotal_with_surcharges ?? 15,
    discount_amount: overrides.discount_amount ?? 0,

    total: overrides.total ?? 123.45,

    cancelled_at: overrides.cancelled_at ?? undefined,
    updated_at: overrides.updated_at ?? undefined,

    packages: overrides.packages ?? [
      {
        weight_kg: 1,
        height_cm: 10,
        width_cm: 10,
        length_cm: 10,
        fragile: false,
        declared_value_q: 0,
        volumetric_kg: undefined,
        billable_kg: undefined,
      },
    ],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();

    pricing = {
      calculatePricing: jest.fn(),
    };

    service = {
      createId: jest.fn().mockReturnValue('ORD-TEST-1'),
      getByIdempotencyKey: jest.fn().mockReturnValue(undefined),
      saveIdempotencyKey: jest.fn(),
      get: jest.fn(),
      save: jest.fn(),
      cancel: jest.fn(),
      list: jest.fn(),
    };

    controller = new OrdersController(
      pricing as unknown as PricingClient,
      service as unknown as OrdersService,
    );
  });

  it('CreateOrder: llama Pricing, guarda orden y retorna status/total/breakdown', async () => {
    pricing.calculatePricing.mockResolvedValue({
      breakdown: {
        order_billable_kg: 1,
        base_subtotal: 10,
        service_subtotal: 5,
        fragile_surcharge: 0,
        insurance_surcharge: 0,
        subtotal_with_surcharges: 15,
        discount_amount: 0,
      },
      total: 123.45,
    });

    service.save.mockResolvedValue(
      makeOrder({
        order_id: 'ORD-TEST-1',
        status: OrderStatus.ACTIVE,
        total: 123.45,
      }),
    );

    const req = {
      origin_zone: 'ZONE_METRO',
      destination_zone: 'ZONE_INTERIOR',
      service_type: 'SERVICE_TYPE_STANDARD',
      packages: [
        { weight_kg: 1, height_cm: 10, width_cm: 10, length_cm: 10, fragile: false, declared_value_q: 0 },
      ],
      insurance_enabled: false,
      idempotency_key: '',
    };

    const res = await controller.createOrder(req);

    expect(pricing.calculatePricing).toHaveBeenCalledTimes(1);
    expect(service.createId).toHaveBeenCalledTimes(1);
    expect(service.save).toHaveBeenCalledTimes(1);

    expect(res.order_id).toBe('ORD-TEST-1');
    expect(res.status).toBe('ORDER_STATUS_ACTIVE'); // ✅ ahora sí
    expect(res.total).toBe(123.45);
    expect(res.breakdown.order_billable_kg).toBe(1);
  });

  it('CreateOrder idempotente: misma key + mismo payload => devuelve orden previa (no duplica)', async () => {
    pricing.calculatePricing.mockResolvedValue({
      breakdown: {
        order_billable_kg: 1,
        base_subtotal: 10,
        service_subtotal: 5,
        fragile_surcharge: 0,
        insurance_surcharge: 0,
        subtotal_with_surcharges: 15,
        discount_amount: 0,
      },
      total: 50,
    });

    service.save.mockResolvedValueOnce(
      makeOrder({
        order_id: 'ORD-TEST-1',
        status: OrderStatus.ACTIVE,
        total: 50,
      }),
    );

    const req = {
      origin_zone: 'ZONE_METRO',
      destination_zone: 'ZONE_METRO',
      service_type: 'SERVICE_TYPE_STANDARD',
      packages: [{ weight_kg: 1, height_cm: 10, width_cm: 10, length_cm: 10, fragile: false, declared_value_q: 0 }],
      insurance_enabled: false,
      idempotency_key: 'KEY-1',
    };

    // 1er create -> guarda idempotencia con hash real
    const r1 = await controller.createOrder(req);
    expect(r1.order_id).toBe('ORD-TEST-1');
    expect(pricing.calculatePricing).toHaveBeenCalledTimes(1);
    expect(service.save).toHaveBeenCalledTimes(1);
    expect(service.saveIdempotencyKey).toHaveBeenCalledTimes(1);

    const [, savedHash, savedOrderId] = service.saveIdempotencyKey.mock.calls[0];
    expect(savedOrderId).toBe('ORD-TEST-1');

    // 2do create -> prev hash = hash real => NO llama pricing ni save, solo get(prev.order_id)
    pricing.calculatePricing.mockClear();
    service.save.mockClear();

    service.getByIdempotencyKey.mockReturnValueOnce({
      payload_hash: savedHash,
      order_id: 'ORD-TEST-1',
    });

    service.get.mockResolvedValueOnce(
      makeOrder({
        order_id: 'ORD-TEST-1',
        status: OrderStatus.ACTIVE,
        total: 50,
      }),
    );

    const r2 = await controller.createOrder(req);

    expect(r2.order_id).toBe('ORD-TEST-1');
    expect(r2.total).toBe(50);
    expect(pricing.calculatePricing).toHaveBeenCalledTimes(0);
    expect(service.save).toHaveBeenCalledTimes(0);
    expect(service.get).toHaveBeenCalledWith('ORD-TEST-1');
  });

  it('CreateOrder idempotente: misma key + payload distinto => FAILED_PRECONDITION', async () => {
    pricing.calculatePricing.mockResolvedValue({
      breakdown: {
        order_billable_kg: 1,
        base_subtotal: 10,
        service_subtotal: 5,
        fragile_surcharge: 0,
        insurance_surcharge: 0,
        subtotal_with_surcharges: 15,
        discount_amount: 0,
      },
      total: 50,
    });

    service.save.mockResolvedValueOnce(
      makeOrder({
        order_id: 'ORD-TEST-1',
        status: OrderStatus.ACTIVE,
        total: 50,
      }),
    );

    const base = {
      origin_zone: 'ZONE_METRO',
      destination_zone: 'ZONE_METRO',
      service_type: 'SERVICE_TYPE_STANDARD',
      packages: [{ weight_kg: 1, height_cm: 10, width_cm: 10, length_cm: 10, fragile: false, declared_value_q: 0 }],
      insurance_enabled: false,
      idempotency_key: 'KEY-1',
      discount: undefined,
    };

    await controller.createOrder(base);

    const [, baseHash] = service.saveIdempotencyKey.mock.calls[0];

    // payload cambia
    const changed = { ...base, insurance_enabled: true };

    service.getByIdempotencyKey.mockReturnValueOnce({
      payload_hash: baseHash, // hash viejo
      order_id: 'ORD-TEST-1',
    });

    try {
      await controller.createOrder(changed);
      fail('Expected RpcException');
    } catch (e: any) {
      const err = getRpcError(e) as any;
      expect(err.code).toBe(GrpcStatus.FAILED_PRECONDITION);
      expect(err.message).toContain('Idempotency key reused with different payload');
    }
  });

  it('GetOrder devuelve NOT_FOUND si no existe', async () => {
    service.get.mockResolvedValueOnce(null);

    await expect(controller.getOrder({ order_id: 'NOPE' })).rejects.toBeInstanceOf(RpcException);

    try {
      await controller.getOrder({ order_id: 'NOPE' });
    } catch (e: any) {
      const err = getRpcError(e) as any;
      expect(err.code).toBe(GrpcStatus.NOT_FOUND);
      expect(err.message).toContain('Order not found');
    }
  });

  it('CancelOrder cambia a CANCELLED; doble cancel => FAILED_PRECONDITION', async () => {
    // 1) found activo
    service.get.mockResolvedValueOnce(
      makeOrder({
        order_id: 'ORD-1',
        status: OrderStatus.ACTIVE,
        total: 10,
      }),
    );

    // 2) cancel devuelve cancelado
    service.cancel.mockResolvedValueOnce(
      makeOrder({
        order_id: 'ORD-1',
        status: OrderStatus.CANCELLED,
        total: 10,
        cancelled_at: new Date('2023-11-15T00:00:00.000Z'),
      }),
    );

    const cancelled = await controller.cancelOrder({ order_id: 'ORD-1' });
    expect(cancelled.order_id).toBe('ORD-1');
    expect(cancelled.status).toBe('ORDER_STATUS_CANCELLED');

    // doble cancel: el controller primero hace get() y ve status CANCELLED
    service.get.mockResolvedValueOnce(
      makeOrder({
        order_id: 'ORD-1',
        status: OrderStatus.CANCELLED,
        total: 10,
        cancelled_at: new Date('2023-11-15T00:00:00.000Z'),
      }),
    );

    await expect(controller.cancelOrder({ order_id: 'ORD-1' })).rejects.toBeInstanceOf(RpcException);
  });

  it('ListOrders pagina y filtra por status (si viene)', async () => {
    service.list.mockResolvedValueOnce([
      makeOrder({ order_id: 'ORD-1', status: OrderStatus.ACTIVE, created_at: new Date('2023-11-16T00:00:00.000Z'), total: 1 }),
      makeOrder({ order_id: 'ORD-2', status: OrderStatus.CANCELLED, created_at: new Date('2023-11-15T00:00:00.000Z'), total: 2 }),
      makeOrder({ order_id: 'ORD-3', status: OrderStatus.ACTIVE, created_at: new Date('2023-11-14T00:00:00.000Z'), total: 3 }),
    ]);

    const res = await controller.listOrders({ page: 1, page_size: 2 });
    expect(res.orders.length).toBe(2);
    expect(res.page).toBe(1);
    expect(res.page_size).toBe(2);

    // ✅ filtro CANCELLED -> el controller convierte a OrderStatus.CANCELLED
    service.list.mockResolvedValueOnce([
      makeOrder({ order_id: 'ORD-2', status: OrderStatus.CANCELLED, created_at: FIXED_DATE, total: 2 }),
    ]);

    const cancelledOnly = await controller.listOrders({ page: 1, page_size: 20, status: 'ORDER_STATUS_CANCELLED' });
    expect(cancelledOnly.orders.length).toBe(1);
    expect(cancelledOnly.orders[0].order_id).toBe('ORD-2');
    expect(cancelledOnly.orders[0].status).toBe('ORDER_STATUS_CANCELLED');
  });
});
