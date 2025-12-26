import { Module } from '@nestjs/common';
import { HealthController } from './controllers/health.controller';
import { OrdersRestController } from './controllers/orders.controller';
import { FxController } from './controllers/fx.controller';

import { OrdersClient } from './grpc/orders.client';
import { ReceiptClient } from './grpc/receipt.client';
import { FxGrpcClient } from './grpc/fx.client';

@Module({
  controllers: [HealthController, OrdersRestController, FxController],
  providers: [OrdersClient, ReceiptClient, FxGrpcClient],
})
export class AppModule {}
