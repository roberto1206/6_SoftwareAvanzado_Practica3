import { Test } from '@nestjs/testing';
import { ReceiptController } from './receipt.controller';
import { OrdersClient } from './orders.client';
import { RpcException } from '@nestjs/microservices';

describe('ReceiptController', () => {
  let controller: ReceiptController;

  const ordersClientMock = {
    getOrder: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ReceiptController],
      providers: [{ provide: OrdersClient, useValue: ordersClientMock }],
    }).compile();

    controller = moduleRef.get(ReceiptController);
    jest.clearAllMocks();
  });

  it('falla con INVALID_ARGUMENT si no viene order_id', async () => {
    await expect(controller.generateReceipt({})).rejects.toBeInstanceOf(RpcException);
  });

  it('genera recibo con order_details + breakdown + total', async () => {
    ordersClientMock.getOrder.mockResolvedValue({
      order_id: 'ORD-1',
      created_at: { seconds: 1700000000, nanos: 0 },
      origin_zone: 'ZONE_METRO',
      destination_zone: 'ZONE_INTERIOR',
      service_type: 'SERVICE_TYPE_STANDARD',
      packages: [
        { weight_kg: 1, height_cm: 10, width_cm: 10, length_cm: 10, fragile: false, declared_value_q: 0 },
        { weight_kg: 2, height_cm: 10, width_cm: 10, length_cm: 10, fragile: true, declared_value_q: 100 },
      ],
      insurance_enabled: true,
      breakdown: { total: 123.45, order_billable_kg: 3 },
      total: 123.45,
    });

    const res = await controller.generateReceipt({ order_id: 'ORD-1' });

    expect(res.order_id).toBe('ORD-1');
    expect(res.created_at.seconds).toBe(1700000000);
    expect(res.generated_at).toBeDefined();

    expect(res.order_details).toEqual({
      origin_zone: 'ZONE_METRO',
      destination_zone: 'ZONE_INTERIOR',
      service_type: 'SERVICE_TYPE_STANDARD',
      package_count: 2,
      insurance_enabled: true,
    });

    expect(res.breakdown.total).toBe(123.45);
    expect(res.total).toBe(123.45);
  });

  it('propaga error si OrdersClient falla (ej. NOT_FOUND)', async () => {
    ordersClientMock.getOrder.mockRejectedValue({ code: 5, message: 'Order not found' });

    await expect(controller.generateReceipt({ order_id: 'NOPE' })).rejects.toEqual(
      expect.objectContaining({ code: 5 }),
    );
  });
});
