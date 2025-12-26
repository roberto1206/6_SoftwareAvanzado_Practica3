import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus, ValidationPipe } from '@nestjs/common';
import request from 'supertest';

import { OrdersRestController } from './controllers/orders.controller';
import { HealthController } from './controllers/health.controller'; // ajusta ruta real
import { OrdersClient } from './grpc/orders.client';
import { ReceiptClient } from './grpc/receipt.client';

describe('Gateway Orders REST', () => {
  let app: INestApplication;

  const ordersClientMock = { call: jest.fn() };
  const receiptClientMock = { call: jest.fn() };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [HealthController, OrdersRestController],
      providers: [
        { provide: OrdersClient, useValue: ordersClientMock },
        { provide: ReceiptClient, useValue: receiptClientMock },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(() => jest.clearAllMocks());
  afterAll(async () => await app.close());

  it('POST /v1/orders → 400 si payload inválido', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/orders')
      .send({ origin_zone: 'ZONE_METRO' });

    expect(res.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('POST /v1/orders → 201 si todo es válido', async () => {
    ordersClientMock.call.mockResolvedValue({
      order_id: 'ORD-1',
      status: 'ORDER_STATUS_ACTIVE',
      total: 50,
    });

    const res = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('Idempotency-Key', 'abc-123')
      .send({
        origin_zone: 'ZONE_METRO',
        destination_zone: 'ZONE_INTERIOR',
        service_type: 'SERVICE_TYPE_STANDARD',
        packages: [{ weight_kg: 1, height_cm: 10, width_cm: 10, length_cm: 10, fragile: false, declared_value_q: 0 }],
        insurance_enabled: false,
      });

    expect(res.status).toBe(HttpStatus.CREATED);
    expect(res.body.order_id).toBe('ORD-1');

    expect(ordersClientMock.call).toHaveBeenCalledWith(
      'CreateOrder',
      expect.objectContaining({ idempotency_key: 'abc-123' }),
    );
  });

  it('GET /v1/orders/:id → 404 cuando gRPC responde NOT_FOUND', async () => {
    ordersClientMock.call.mockRejectedValue({ code: 5, message: 'Order not found' });

    const res = await request(app.getHttpServer()).get('/v1/orders/NOPE');
    expect(res.status).toBe(HttpStatus.NOT_FOUND);
  });

  it('POST /v1/orders/:id/cancel → 409 cuando gRPC FAILED_PRECONDITION', async () => {
    ordersClientMock.call.mockRejectedValue({ code: 9, message: 'Order already cancelled' });

    const res = await request(app.getHttpServer()).post('/v1/orders/ORD-1/cancel');
    expect(res.status).toBe(HttpStatus.CONFLICT);
  });

  it('POST /v1/orders → 503 cuando gRPC UNAVAILABLE', async () => {
    ordersClientMock.call.mockRejectedValue({ code: 14, message: 'Orders service down' });

    const res = await request(app.getHttpServer())
      .post('/v1/orders')
      .send({
        origin_zone: 'ZONE_METRO',
        destination_zone: 'ZONE_INTERIOR',
        service_type: 'SERVICE_TYPE_STANDARD',
        packages: [{ weight_kg: 1, height_cm: 10, width_cm: 10, length_cm: 10, fragile: false, declared_value_q: 0 }],
        insurance_enabled: false,
      });

    expect(res.status).toBe(HttpStatus.SERVICE_UNAVAILABLE);
  });

  it('GET /v1/orders/:id/receipt → 200 cuando receipt responde bien', async () => {
    receiptClientMock.call.mockResolvedValue({ order_id: 'ORD-1', total: 50 });

    const res = await request(app.getHttpServer()).get('/v1/orders/ORD-1/receipt');
    expect(res.status).toBe(HttpStatus.OK);
    expect(res.body.order_id).toBe('ORD-1');
    expect(receiptClientMock.call).toHaveBeenCalledWith({ order_id: 'ORD-1' });
  });
});
