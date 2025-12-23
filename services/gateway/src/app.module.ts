
import { Module } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { OrdersRestController } from './controllers/orders.controller';
import { OrdersClient } from './grpc/orders.client';
import { ReceiptClient } from './grpc/receipt.client';

@Module({
  controllers: [HealthController, OrdersRestController],
  providers: [OrdersClient, ReceiptClient],
})
export class AppModule {}
