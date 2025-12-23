import { Controller } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { createHash } from 'crypto';

import { PricingClient } from './pricing.client';
import type { OrderEntity } from './orders.store';
import { OrdersStore } from './orders.store';

@Controller()
export class OrdersController {
  constructor(
    private readonly pricing: PricingClient,
    private readonly store: OrdersStore,
  ) {}

  private hashPayload(obj: any): string {
    return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
  }

  @GrpcMethod('OrdersService', 'CreateOrder')
  async createOrder(req: any) {
    // Idempotencia (simple) usando el idempotency_key que metiste en el proto
    // Regla: misma key + mismo payload => misma respuesta
    //       misma key + payload distinto => FAILED_PRECONDITION (o ALREADY_EXISTS/ABORTED)
    const idKey: string | undefined = req.idempotency_key || undefined;

    const payloadToHash = {
      origin_zone: req.origin_zone,
      destination_zone: req.destination_zone,
      service_type: req.service_type,
      packages: req.packages,
      discount: req.discount,
      insurance_enabled: req.insurance_enabled,
    };
    const hash = this.hashPayload(payloadToHash);

    if (idKey) {
      const prev = this.store.getByIdempotencyKey(idKey);
      if (prev) {
        if (prev.payload_hash !== hash) {
          throw new RpcException({
            code: GrpcStatus.FAILED_PRECONDITION,
            message: 'Idempotency key reused with different payload',
          });
        }
        const existing = this.store.get(prev.order_id);
        if (existing) {
          return this.toCreateOrderResponse(existing);
        }
      }
    }

    // Llamada a Pricing
    let pricingRes;
    try {
      pricingRes = await this.pricing.calculatePricing({
        origin_zone: req.origin_zone,
        destination_zone: req.destination_zone,
        service_type: req.service_type,
        packages: req.packages,
        discount: req.discount,
        insurance_enabled: req.insurance_enabled,
      });
    } catch (e: any) {
      // Pricing no disponible / timeout: lo mapea luego Gateway a 503/504
      throw new RpcException({
        code: GrpcStatus.UNAVAILABLE,
        message: `PricingService error: ${e?.message ?? 'unknown'}`,
      });
    }

    const order_id = this.store.createId();
    const created_at = this.store.nowTimestamp();

    const entity: OrderEntity = {
      order_id,
      created_at,
      status: 'ORDER_STATUS_ACTIVE',
      origin_zone: req.origin_zone,
      destination_zone: req.destination_zone,
      service_type: req.service_type,
      packages: req.packages,
      discount: req.discount,
      insurance_enabled: req.insurance_enabled,
      breakdown: pricingRes.breakdown,
      total: pricingRes.total,
      idempotency_key: idKey,
      payload_hash: hash,
    };


    this.store.save(entity);

    if (idKey) {
      this.store.saveIdempotencyKey(idKey, hash, order_id);
    }

    return this.toCreateOrderResponse(entity);
  }

  @GrpcMethod('OrdersService', 'GetOrder')
  getOrder(req: any) {
    const found = this.store.get(req.order_id);
    if (!found) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Order not found',
      });
    }
    return this.toGetOrderResponse(found);
  }

  @GrpcMethod('OrdersService', 'ListOrders')
  listOrders(req: any) {
    const page = req.page && req.page > 0 ? req.page : 1;
    const pageSize =
      req.page_size && req.page_size > 0 ? Math.min(req.page_size, 100) : 20;

    let items = this.store.list();

    // status opcional (si viene)
    if (req.status && req.status !== 'ORDER_STATUS_UNSPECIFIED') {
      items = items.filter((o) => o.status === req.status);
    }

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = items.slice(start, end);

    return {
      orders: pageItems.map((o) => ({
        order_id: o.order_id,
        created_at: o.created_at,
        destination_zone: o.destination_zone,
        service_type: o.service_type,
        status: o.status,
        total: o.total,
      })),
      page,
      page_size: pageSize,
      total_items: totalItems,
      total_pages: totalPages,
    };
  }

  @GrpcMethod('OrdersService', 'CancelOrder')
  cancelOrder(req: any) {
    const found = this.store.get(req.order_id);
    if (!found) {
      throw new RpcException({ code: GrpcStatus.NOT_FOUND, message: 'Order not found' });
    }

    if (found.status === 'ORDER_STATUS_CANCELLED') {
      throw new RpcException({
        code: GrpcStatus.FAILED_PRECONDITION,
        message: 'Order already cancelled',
      });
    }

    found.status = 'ORDER_STATUS_CANCELLED';
    this.store.save(found);

    return {
      order_id: found.order_id,
      status: found.status,
      created_at: found.created_at,
      total: found.total,
    };
  }

  private toCreateOrderResponse(o: any) {
    return {
      order_id: o.order_id,
      created_at: o.created_at,
      status: o.status,
      origin_zone: o.origin_zone,
      destination_zone: o.destination_zone,
      service_type: o.service_type,
      packages: o.packages,
      discount: o.discount,
      insurance_enabled: o.insurance_enabled,
      breakdown: o.breakdown,
      total: o.total,
    };
  }

  private toGetOrderResponse(o: any) {
    return {
      order_id: o.order_id,
      created_at: o.created_at,
      status: o.status,
      origin_zone: o.origin_zone,
      destination_zone: o.destination_zone,
      service_type: o.service_type,
      packages: o.packages,
      discount: o.discount,
      insurance_enabled: o.insurance_enabled,
      breakdown: o.breakdown,
      total: o.total,
    };
  }
}
