import { Controller } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { createHash } from 'crypto';

import { PricingClient } from './pricing.client';
import { OrdersService } from './orders.service';
import {
  OrderEntity,
  OrderStatus,
  Zone,
  ServiceType,
  DiscountType,
} from './entities/order.entity';
import { PackageEntity } from './entities/package.entity';

// Mapeo de enums gRPC a enums de BD (acepta tanto string como número)
const ZONE_MAP: Record<string | number, Zone> = {
  ZONE_METRO: Zone.METRO,
  ZONE_INTERIOR: Zone.INTERIOR,
  ZONE_FRONTERA: Zone.FRONTERA,
  1: Zone.METRO,       // gRPC enum value
  2: Zone.INTERIOR,    // gRPC enum value
  3: Zone.FRONTERA,    // gRPC enum value
};

const SERVICE_TYPE_MAP: Record<string | number, ServiceType> = {
  SERVICE_TYPE_STANDARD: ServiceType.STANDARD,
  SERVICE_TYPE_EXPRESS: ServiceType.EXPRESS,
  SERVICE_TYPE_SAME_DAY: ServiceType.SAME_DAY,
  1: ServiceType.STANDARD,  // gRPC enum value
  2: ServiceType.EXPRESS,   // gRPC enum value
  3: ServiceType.SAME_DAY,  // gRPC enum value
};

const DISCOUNT_TYPE_MAP: Record<string | number, DiscountType> = {
  DISCOUNT_TYPE_NONE: DiscountType.NONE,
  DISCOUNT_TYPE_PERCENT: DiscountType.PERCENT,
  DISCOUNT_TYPE_FIXED: DiscountType.FIXED,
  1: DiscountType.NONE,     // gRPC enum value
  2: DiscountType.PERCENT,  // gRPC enum value
  3: DiscountType.FIXED,    // gRPC enum value
};

// Mapeo inverso para respuestas
const ZONE_REVERSE_MAP: Record<Zone, string> = {
  [Zone.METRO]: 'ZONE_METRO',
  [Zone.INTERIOR]: 'ZONE_INTERIOR',
  [Zone.FRONTERA]: 'ZONE_FRONTERA',
};

const SERVICE_TYPE_REVERSE_MAP: Record<ServiceType, string> = {
  [ServiceType.STANDARD]: 'SERVICE_TYPE_STANDARD',
  [ServiceType.EXPRESS]: 'SERVICE_TYPE_EXPRESS',
  [ServiceType.SAME_DAY]: 'SERVICE_TYPE_SAME_DAY',
};

const DISCOUNT_TYPE_REVERSE_MAP: Record<DiscountType, string> = {
  [DiscountType.NONE]: 'DISCOUNT_TYPE_NONE',
  [DiscountType.PERCENT]: 'DISCOUNT_TYPE_PERCENT',
  [DiscountType.FIXED]: 'DISCOUNT_TYPE_FIXED',
};

const STATUS_REVERSE_MAP: Record<OrderStatus, string> = {
  [OrderStatus.ACTIVE]: 'ORDER_STATUS_ACTIVE',
  [OrderStatus.CANCELLED]: 'ORDER_STATUS_CANCELLED',
};

@Controller()
export class OrdersController {
  constructor(
    private readonly pricing: PricingClient,
    private readonly ordersService: OrdersService,
  ) {}

  private hashPayload(obj: any): string {
    return createHash('sha256').update(JSON.stringify(obj)).digest('hex');
  }

  private dateToTimestamp(date: Date) {
    const ms = date.getTime();
    const seconds = Math.floor(ms / 1000);
    const nanos = (ms % 1000) * 1_000_000;
    return { seconds, nanos };
  }

  @GrpcMethod('OrdersService', 'CreateOrder')
  async createOrder(req: any) {
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

    // Verificar idempotencia
    if (idKey) {
      const prev = this.ordersService.getByIdempotencyKey(idKey);
      if (prev) {
        if (prev.payload_hash !== hash) {
          throw new RpcException({
            code: GrpcStatus.FAILED_PRECONDITION,
            message: 'Idempotency key reused with different payload',
          });
        }
        const existing = await this.ordersService.get(prev.order_id);
        if (existing) {
          return this.toCreateOrderResponse(existing);
        }
      }
    }

    // Llamada a Pricing
    let pricingRes: any;
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
      throw new RpcException({
        code: GrpcStatus.UNAVAILABLE,
        message: `PricingService error: ${e?.message ?? 'unknown'}`,
      });
    }

    const order_id = this.ordersService.createId();

    // Mapear el breakdown de pricing a los campos de la BD
    const breakdown = pricingRes.breakdown;

    // Validar que los valores existan en los mapeos
    if (!ZONE_MAP[req.origin_zone]) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: `Invalid origin_zone: ${req.origin_zone}`,
      });
    }
    if (!ZONE_MAP[req.destination_zone]) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: `Invalid destination_zone: ${req.destination_zone}`,
      });
    }
    if (!SERVICE_TYPE_MAP[req.service_type]) {
      throw new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message: `Invalid service_type: ${req.service_type}`,
      });
    }

    // Preparar datos de la orden
    const orderData: Partial<OrderEntity> = {
      order_id,
      status: OrderStatus.ACTIVE,
      origin_zone: ZONE_MAP[req.origin_zone],
      destination_zone: ZONE_MAP[req.destination_zone],
      service_type: SERVICE_TYPE_MAP[req.service_type],
      insurance_enabled: req.insurance_enabled || false,
      discount_type: req.discount?.discount_type
        ? DISCOUNT_TYPE_MAP[req.discount.discount_type]
        : undefined,
      discount_value: req.discount?.discount_value || undefined,
      order_billable_kg: breakdown.order_billable_kg,
      base_subtotal: breakdown.base_subtotal,
      service_subtotal: breakdown.service_subtotal,
      fragile_surcharge: breakdown.fragile_surcharge || 0,
      insurance_surcharge: breakdown.insurance_surcharge || 0,
      subtotal_with_surcharges: breakdown.subtotal_with_surcharges,
      discount_amount: breakdown.discount_amount || 0,
      total: pricingRes.total,
    };

    // Preparar datos de los paquetes
    const packagesData: Partial<PackageEntity>[] = req.packages.map(
      (pkg: any) => ({
        weight_kg: pkg.weight_kg,
        height_cm: pkg.height_cm,
        width_cm: pkg.width_cm,
        length_cm: pkg.length_cm,
        fragile: pkg.fragile || false,
        declared_value_q: pkg.declared_value_q || 0,
        volumetric_kg: pkg.volumetric_kg,
        billable_kg: pkg.billable_kg,
      }),
    );

    // Guardar en BD
    const savedOrder = await this.ordersService.save(orderData, packagesData);

    // Guardar idempotencia
    if (idKey) {
      this.ordersService.saveIdempotencyKey(idKey, hash, order_id);
    }

    return this.toCreateOrderResponse(savedOrder);
  }

  @GrpcMethod('OrdersService', 'GetOrder')
  async getOrder(req: any) {
    const found = await this.ordersService.get(req.order_id);
    if (!found) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Order not found',
      });
    }
    return this.toGetOrderResponse(found);
  }

  @GrpcMethod('OrdersService', 'ListOrders')
  async listOrders(req: any) {
    const page = req.page && req.page > 0 ? req.page : 1;
    const pageSize =
      req.page_size && req.page_size > 0 ? Math.min(req.page_size, 100) : 20;

    // Mapear status de gRPC a BD si viene
    let statusFilter: OrderStatus | undefined;
    if (req.status && req.status !== 'ORDER_STATUS_UNSPECIFIED') {
      statusFilter =
        req.status === 'ORDER_STATUS_ACTIVE'
          ? OrderStatus.ACTIVE
          : OrderStatus.CANCELLED;
    }

    let items = await this.ordersService.list(statusFilter);

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = items.slice(start, end);

    return {
      orders: pageItems.map((o) => ({
        order_id: o.order_id,
        created_at: this.dateToTimestamp(o.created_at),
        destination_zone: ZONE_REVERSE_MAP[o.destination_zone],
        service_type: SERVICE_TYPE_REVERSE_MAP[o.service_type],
        status: STATUS_REVERSE_MAP[o.status],
        total: o.total,
      })),
      page,
      page_size: pageSize,
      total_items: totalItems,
      total_pages: totalPages,
    };
  }

  @GrpcMethod('OrdersService', 'CancelOrder')
  async cancelOrder(req: any) {
    const found = await this.ordersService.get(req.order_id);
    if (!found) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Order not found',
      });
    }

    if (found.status === OrderStatus.CANCELLED) {
      throw new RpcException({
        code: GrpcStatus.FAILED_PRECONDITION,
        message: 'Order already cancelled',
      });
    }

    const cancelledOrder = await this.ordersService.cancel(req.order_id);

    return {
      order_id: cancelledOrder.order_id,
      status: STATUS_REVERSE_MAP[cancelledOrder.status],
      created_at: this.dateToTimestamp(cancelledOrder.created_at),
      total: cancelledOrder.total,
    };
  }

  private toCreateOrderResponse(o: OrderEntity) {
    return {
      order_id: o.order_id,
      created_at: this.dateToTimestamp(o.created_at),
      status: STATUS_REVERSE_MAP[o.status],
      origin_zone: ZONE_REVERSE_MAP[o.origin_zone],
      destination_zone: ZONE_REVERSE_MAP[o.destination_zone],
      service_type: SERVICE_TYPE_REVERSE_MAP[o.service_type],
      packages: o.packages.map((pkg) => ({
        weight_kg: pkg.weight_kg,
        height_cm: pkg.height_cm,
        width_cm: pkg.width_cm,
        length_cm: pkg.length_cm,
        fragile: pkg.fragile,
        declared_value_q: pkg.declared_value_q,
        volumetric_kg: pkg.volumetric_kg,
        billable_kg: pkg.billable_kg,
      })),
      discount: o.discount_type
        ? {
            discount_type: DISCOUNT_TYPE_REVERSE_MAP[o.discount_type],
            discount_value: o.discount_value || 0,
          }
        : null,
      insurance_enabled: o.insurance_enabled,
      breakdown: {
        order_billable_kg: o.order_billable_kg,
        base_subtotal: o.base_subtotal,
        service_subtotal: o.service_subtotal,
        fragile_surcharge: o.fragile_surcharge,
        insurance_surcharge: o.insurance_surcharge,
        subtotal_with_surcharges: o.subtotal_with_surcharges,
        discount_amount: o.discount_amount,
      },
      total: o.total,
    };
  }

  private toGetOrderResponse(o: OrderEntity) {
    return this.toCreateOrderResponse(o);
  }
}
