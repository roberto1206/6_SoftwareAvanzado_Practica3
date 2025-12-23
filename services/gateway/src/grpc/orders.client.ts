
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, Transport } from '@nestjs/microservices';
import type { ClientGrpc } from '@nestjs/microservices';
import { join } from 'path';

interface OrdersServiceClient {
  CreateOrder(req: any): any;
  GetOrder(req: any): any;
  ListOrders(req: any): any;
  CancelOrder(req: any): any;
}

// Calcular rutas según el entorno
const ordersProtoPath =
  process.env.NODE_ENV === 'production'
    ? join(process.cwd(), 'contracts/proto/orders/orders.proto') // Docker: usar cwd()
    : join(__dirname, '../../../contracts/proto/orders/orders.proto'); // Local

const includeDir =
  process.env.NODE_ENV === 'production'
    ? join(process.cwd(), 'contracts/proto') // Docker: usar cwd()
    : join(__dirname, '../../../contracts/proto'); // Local

@Injectable()
export class OrdersClient implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      url: 'orders:50053',
      package: 'quetzalship.orders.v1',
      protoPath: ordersProtoPath,
      loader: {
        keepCase: true,
        includeDirs: [includeDir],
      },
    },
  })
  private readonly client!: ClientGrpc;

  private svc!: OrdersServiceClient;

  onModuleInit() {
    this.svc = this.client.getService<OrdersServiceClient>('OrdersService');
  }

  call<T = any>(method: keyof OrdersServiceClient, payload: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const obs: any = (this.svc[method] as any)(payload);
      obs.subscribe({ next: resolve, error: reject });
    });
  }
}