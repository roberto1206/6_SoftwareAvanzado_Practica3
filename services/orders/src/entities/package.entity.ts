import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { OrderEntity } from './order.entity';

@Entity('Packages')
export class PackageEntity {
  @PrimaryGeneratedColumn()
  package_id: number;

  @Column({ type: 'varchar', length: 50 })
  order_id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  weight_kg: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  height_cm: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  width_cm: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  length_cm: number;

  @Column({ type: 'bit', default: false })
  fragile: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  declared_value_q: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  volumetric_kg?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  billable_kg?: number;

  @CreateDateColumn({ type: 'datetime2', precision: 7 })
  created_at: Date;

  @ManyToOne(() => OrderEntity, (order) => order.packages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: OrderEntity;
}
