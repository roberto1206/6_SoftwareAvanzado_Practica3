import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { PricingClient } from './pricing.client';
import { OrdersStore } from './orders.store';

@Module({
  controllers: [OrdersController],
  providers: [PricingClient, OrdersStore],
})
export class AppModule {}
