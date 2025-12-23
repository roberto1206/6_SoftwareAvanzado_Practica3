import { Module } from '@nestjs/common';
import { ReceiptController } from './receipt.controller';
import { OrdersClient } from './orders.client';

@Module({
  controllers: [ReceiptController],
  providers: [OrdersClient],
})
export class AppModule {}
