import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { RpcException } from '@nestjs/microservices';
import { OrdersClient } from './orders.client';

@Controller()
export class ReceiptController {
  constructor(private readonly orders: OrdersClient) {}

  private nowTimestamp() {
    const ms = Date.now();
    return { seconds: Math.floor(ms / 1000), nanos: (ms % 1000) * 1_000_000 };
  }

  @GrpcMethod('ReceiptService', 'GenerateReceipt')
  async generateReceipt(req: any) {
    const orderId = req?.order_id;
    if (!orderId) {
      throw new RpcException({ code: GrpcStatus.INVALID_ARGUMENT, message: 'order_id requerido' });
    }

    let order: any;
    try {
      order = await this.orders.getOrder(orderId);
    } catch (e: any) {
      // Propaga NOT_FOUND u otros errores tal cual (Gateway los mapeará)
      throw e;
    }

    const packageCount = Array.isArray(order.packages) ? order.packages.length : 0;

    return {
      order_id: order.order_id,
      created_at: order.created_at,
      generated_at: this.nowTimestamp(),
      order_details: {
        origin_zone: order.origin_zone,
        destination_zone: order.destination_zone,
        service_type: order.service_type,
        package_count: packageCount,
        insurance_enabled: order.insurance_enabled,
      },
      breakdown: order.breakdown,
      total: order.total,
    };
  }
}
