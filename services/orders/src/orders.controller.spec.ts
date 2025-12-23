import { OrdersController } from './orders.controller';
import { OrdersStore } from './orders.store';
import { PricingClient } from './pricing.client';
import { RpcException } from '@nestjs/microservices';

function getRpcError(e: any) {
  if (e instanceof RpcException) return e.getError();
  return e;
}

describe('OrdersController', () => {
  let controller: OrdersController;

  // Mocks
  let pricing: Partial<PricingClient>;
  let store: OrdersStore;

  beforeEach(() => {
    pricing = {
      calculatePricing: jest.fn(),
    };

    store = new OrdersStore();

    // Hacemos determinista el tiempo y el ID para aserciones estables
    jest.spyOn(store, 'createId').mockReturnValue('ORD-TEST-1');
    jest.spyOn(store, 'nowTimestamp').mockReturnValue({ seconds: 1700000000, nanos: 0 });

    controller = new OrdersController(pricing as PricingClient, store);
  });

  it('CreateOrder guarda orden en memoria con breakdown/total (llama a Pricing)', async () => {
    (pricing.calculatePricing as jest.Mock).mockResolvedValue({
      breakdown: { total: 123.45, order_billable_kg: 1 },
      total: 123.45,
    });

    const req = {
      origin_zone: 'ZONE_METRO',
      destination_zone: 'ZONE_INTERIOR',
      service_type: 'SERVICE_TYPE_STANDARD',
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
      insurance_enabled: false,
      idempotency_key: '',
    };

    const res = await controller.createOrder(req);

    expect(pricing.calculatePricing).toHaveBeenCalledTimes(1);
    expect(res.order_id).toBe('ORD-TEST-1');
    expect(res.status).toBe('ORDER_STATUS_ACTIVE');
    expect(res.total).toBe(123.45);
    expect(store.get('ORD-TEST-1')).toBeDefined();
    expect(store.get('ORD-TEST-1')!.breakdown.total).toBe(123.45);
  });

  it('CreateOrder idempotente: misma key + mismo payload => misma respuesta (no duplica)', async () => {
    (pricing.calculatePricing as jest.Mock).mockResolvedValue({
      breakdown: { total: 50, order_billable_kg: 1 },
      total: 50,
    });

    // Primer create genera ORD-TEST-1
    const req1 = {
      origin_zone: 'ZONE_METRO',
      destination_zone: 'ZONE_METRO',
      service_type: 'SERVICE_TYPE_STANDARD',
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
      insurance_enabled: false,
      idempotency_key: 'KEY-1',
    };

    const r1 = await controller.createOrder(req1);
    expect(r1.order_id).toBe('ORD-TEST-1');
    expect(pricing.calculatePricing).toHaveBeenCalledTimes(1);

    // Segundo create: misma key + mismo payload => no genera otra
    // Si se intenta recalcular, igual te daría mismo resultado, pero la regla es “misma respuesta”
    // y “sin duplicar orden”.
    (pricing.calculatePricing as jest.Mock).mockClear();
    jest.spyOn(store, 'createId').mockReturnValue('ORD-TEST-2'); // por si intenta crear otra

    const r2 = await controller.createOrder(req1);

    expect(r2.order_id).toBe('ORD-TEST-1');
    expect(pricing.calculatePricing).toHaveBeenCalledTimes(0);
    expect(store.get('ORD-TEST-2')).toBeUndefined();
  });

  it('CreateOrder idempotente: misma key + payload distinto => FAILED_PRECONDITION', async () => {
    (pricing.calculatePricing as jest.Mock).mockResolvedValue({
      breakdown: { total: 50, order_billable_kg: 1 },
      total: 50,
    });

    const base = {
      origin_zone: 'ZONE_METRO',
      destination_zone: 'ZONE_METRO',
      service_type: 'SERVICE_TYPE_STANDARD',
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
      insurance_enabled: false,
      idempotency_key: 'KEY-1',
    };

    await controller.createOrder(base);

    const changed = { ...base, insurance_enabled: true }; // cambia payload

    await expect(controller.createOrder(changed)).rejects.toBeInstanceOf(RpcException);
    try {
      await controller.createOrder(changed);
    } catch (e: any) {
      const err = getRpcError(e) as any;
      expect(err.code).toBeDefined();
      // FAILED_PRECONDITION (9)
      expect(err.message).toContain('Idempotency key reused with different payload');
    }
  });

  it('GetOrder devuelve NOT_FOUND si no existe', () => {
    expect(() => controller.getOrder({ order_id: 'NOPE' })).toThrow(RpcException);
    try {
      controller.getOrder({ order_id: 'NOPE' });
    } catch (e: any) {
      const err = getRpcError(e) as any;
      // NOT_FOUND (5)
      expect(err.message).toContain('Order not found');
    }
  });

  it('CancelOrder cambia a CANCELLED y no borra datos; doble cancel => FAILED_PRECONDITION', async () => {
    (pricing.calculatePricing as jest.Mock).mockResolvedValue({
      breakdown: { total: 10, order_billable_kg: 1 },
      total: 10,
    });

    const req = {
      origin_zone: 'ZONE_METRO',
      destination_zone: 'ZONE_METRO',
      service_type: 'SERVICE_TYPE_STANDARD',
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
      insurance_enabled: false,
      idempotency_key: '',
    };

    const created = await controller.createOrder(req);
    expect(created.status).toBe('ORDER_STATUS_ACTIVE');

    const cancelled = controller.cancelOrder({ order_id: created.order_id });
    expect(cancelled.status).toBe('ORDER_STATUS_CANCELLED');

    // Aún existe en memoria
    const stored = store.get(created.order_id)!;
    expect(stored.status).toBe('ORDER_STATUS_CANCELLED');

    // doble cancel
    expect(() => controller.cancelOrder({ order_id: created.order_id })).toThrow(RpcException);
  });

  it('ListOrders pagina y filtra por status (si viene)', async () => {
    (pricing.calculatePricing as jest.Mock).mockResolvedValue({
      breakdown: { total: 1, order_billable_kg: 1 },
      total: 1,
    });

    // Creamos 3 órdenes
    jest.spyOn(store, 'createId')
      .mockReturnValueOnce('ORD-1')
      .mockReturnValueOnce('ORD-2')
      .mockReturnValueOnce('ORD-3');

    const baseReq = {
      origin_zone: 'ZONE_METRO',
      destination_zone: 'ZONE_METRO',
      service_type: 'SERVICE_TYPE_STANDARD',
      packages: [{ weight_kg: 1, height_cm: 10, width_cm: 10, length_cm: 10, fragile: false, declared_value_q: 0 }],
      insurance_enabled: false,
      idempotency_key: '',
    };

    await controller.createOrder(baseReq);
    await controller.createOrder(baseReq);
    await controller.createOrder(baseReq);

    // Cancelamos ORD-2
    controller.cancelOrder({ order_id: 'ORD-2' });

    // page_size=2
    const res = controller.listOrders({ page: 1, page_size: 2 });
    expect(res.orders.length).toBe(2);
    expect(res.page).toBe(1);
    expect(res.page_size).toBe(2);

    // filtrar CANCELLED
    const cancelledOnly = controller.listOrders({ page: 1, page_size: 20, status: 'ORDER_STATUS_CANCELLED' });
    expect(cancelledOnly.orders.length).toBe(1);
    expect(cancelledOnly.orders[0].order_id).toBe('ORD-2');
  });
});
