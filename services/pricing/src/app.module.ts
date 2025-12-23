import { Module } from '@nestjs/common';
import { PricingController } from './pricing.controller';

@Module({
  imports: [],
  controllers: [PricingController],
  providers: [],
})
export class AppModule {}
