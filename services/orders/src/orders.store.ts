import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export type OrderStatus =
  | 'ORDER_STATUS_UNSPECIFIED'
  | 'ORDER_STATUS_ACTIVE'
  | 'ORDER_STATUS_CANCELLED';

export interface OrderEntity {
  order_id: string;
  created_at: { seconds: number; nanos: number };
  status: OrderStatus;

  origin_zone: any;
  destination_zone: any;
  service_type: any;
  packages: any[];
  discount?: any;
  insurance_enabled: boolean;

  breakdown: any;
  total: number;

  // Para idempotencia (simple)
  idempotency_key?: string;
  payload_hash?: string;
}

@Injectable()
export class OrdersStore {
  private readonly orders = new Map<string, OrderEntity>();

  // key -> { hash, order_id }
  private readonly idem = new Map<
    string,
    { payload_hash: string; order_id: string }
  >();

  nowTimestamp() {
    const ms = Date.now();
    const seconds = Math.floor(ms / 1000);
    const nanos = (ms % 1000) * 1_000_000;
    return { seconds, nanos };
  }

  createId(): string {
    return `ORD-${randomUUID()}`;
  }

  get(orderId: string): OrderEntity | undefined {
    return this.orders.get(orderId);
  }

  list(): OrderEntity[] {
    return Array.from(this.orders.values()).sort((a, b) => {
      // más reciente primero
      return (b.created_at.seconds ?? 0) - (a.created_at.seconds ?? 0);
    });
  }

  save(order: OrderEntity) {
    this.orders.set(order.order_id, order);
  }

  // Idempotencia simple: misma key + mismo hash => retorna orden previa
  // key + hash distinto => conflicto
  getByIdempotencyKey(key: string) {
    return this.idem.get(key);
  }

  saveIdempotencyKey(key: string, payload_hash: string, order_id: string) {
    this.idem.set(key, { payload_hash, order_id });
  }
}
