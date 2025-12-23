import { Injectable, OnModuleInit } from '@nestjs/common';
import { Client, Transport } from '@nestjs/microservices';
import type { ClientGrpc } from '@nestjs/microservices';
import { join } from 'path';

interface OrdersServiceClient {
  GetOrder(req: any): any;
}

// Calcular rutas según el entorno
const ordersProtoPath =
  process.env.NODE_ENV === 'production'
    ? join(__dirname, '../contracts/proto/orders/orders.proto') // Docker: 1 nivel arriba
    : join(__dirname, '../../../contracts/proto/orders/orders.proto'); // Local: 3 niveles arriba

const includeDir =
  process.env.NODE_ENV === 'production'
    ? join(__dirname, '../contracts/proto') // Docker
    : join(__dirname, '../../../contracts/proto'); // Local

@Injectable()
export class OrdersClient implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      url: 'orders:50053', // en compose; local: localhost:50053
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

  async getOrder(order_id: string): Promise<any> {
    return await new Promise((resolve, reject) => {
      const obs: any = this.svc.GetOrder({ order_id });
      obs.subscribe({ next: resolve, error: reject });
    });
  }
}

