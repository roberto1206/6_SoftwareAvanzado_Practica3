import {
  Entity,
  Column,
  PrimaryColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PackageEntity } from './package.entity';

export enum OrderStatus {
  ACTIVE = 1,
  CANCELLED = 2,
}

export enum Zone {
  METRO = 1,
  INTERIOR = 2,
  FRONTERA = 3,
}

export enum ServiceType {
  STANDARD = 1,
  EXPRESS = 2,
  SAME_DAY = 3,
}

export enum DiscountType {
  NONE = 1,
  PERCENT = 2,
  FIXED = 3,
}

@Entity('Orders')
export class OrderEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  order_id: string;

  @CreateDateColumn({ type: 'datetime2', precision: 7 })
  created_at: Date;

  @Column({ type: 'tinyint', default: OrderStatus.ACTIVE })
  status: OrderStatus;

  @Column({ type: 'tinyint' })
  origin_zone: Zone;

  @Column({ type: 'tinyint' })
  destination_zone: Zone;

  @Column({ type: 'tinyint' })
  service_type: ServiceType;

  @Column({ type: 'bit', default: false })
  insurance_enabled: boolean;

  @Column({ type: 'tinyint', nullable: true })
  discount_type?: DiscountType;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discount_value?: number;

  // Desglose de cálculo
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  order_billable_kg: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  base_subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  service_subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fragile_surcharge: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  insurance_surcharge: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal_with_surcharges: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @UpdateDateColumn({ type: 'datetime2', precision: 7, nullable: true })
  updated_at?: Date;

  @Column({ type: 'datetime2', precision: 7, nullable: true })
  cancelled_at?: Date;

  @OneToMany(() => PackageEntity, (pkg) => pkg.order, { cascade: true })
  packages: PackageEntity[];
}
