import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { OrderEntity, OrderStatus } from './entities/order.entity';
import { PackageEntity } from './entities/package.entity';

export interface IdempotencyRecord {
  payload_hash: string;
  order_id: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  // Mantenemos idempotency en memoria por simplicidad
  // En producción, esto debería estar en Redis o una tabla de BD
  private readonly idem = new Map<string, IdempotencyRecord>();

  constructor(
    @InjectRepository(OrderEntity)
    private readonly orderRepository: Repository<OrderEntity>,
    @InjectRepository(PackageEntity)
    private readonly packageRepository: Repository<PackageEntity>,
  ) {}

  nowTimestamp() {
    const ms = Date.now();
    const seconds = Math.floor(ms / 1000);
    const nanos = (ms % 1000) * 1_000_000;
    return { seconds, nanos };
  }

  createId(): string {
    return `ORD-${randomUUID()}`;
  }

  async get(orderId: string): Promise<OrderEntity | null> {
    return this.orderRepository.findOne({
      where: { order_id: orderId },
      relations: ['packages'],
    });
  }

  async list(status?: OrderStatus): Promise<OrderEntity[]> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.packages', 'packages')
      .orderBy('order.created_at', 'DESC');

    if (status) {
      queryBuilder.where('order.status = :status', { status });
    }

    return queryBuilder.getMany();
  }

  async save(
    orderData: Partial<OrderEntity>,
    packagesData: Partial<PackageEntity>[],
  ): Promise<OrderEntity> {
    return await this.orderRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Guardar la orden
        const order = this.orderRepository.create(orderData);
        const savedOrder = await transactionalEntityManager.save(order);

        // Guardar los paquetes
        const savedPackages: PackageEntity[] = [];
        if (packagesData && packagesData.length > 0) {
          const packages = packagesData.map((pkgData) => {
            return this.packageRepository.create({
              ...pkgData,
              order_id: savedOrder.order_id,
            });
          });
          const pkgResults = await transactionalEntityManager.save(packages);
          savedPackages.push(...pkgResults);
        }

        // Retornar la orden con sus paquetes cargados en memoria
        savedOrder.packages = savedPackages;
        return savedOrder;
      },
    );
  }

  async cancel(orderId: string): Promise<OrderEntity> {
    const order = await this.get(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelled_at = new Date();

    return this.orderRepository.save(order);
  }

  // Idempotencia simple: misma key + mismo hash => retorna orden previa
  // key + hash distinto => conflicto
  getByIdempotencyKey(key: string): IdempotencyRecord | undefined {
    return this.idem.get(key);
  }

  saveIdempotencyKey(
    key: string,
    payload_hash: string,
    order_id: string,
  ): void {
    this.idem.set(key, { payload_hash, order_id });
  }
}
