import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FxController } from './controllers/fx.controller';
import { FxService } from './services/fx.service';
import { RedisService } from './services/redis.service';
import { ExternalApiService } from './services/external-api.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [FxController],
  providers: [FxService, RedisService, ExternalApiService],
  exports: [FxService],
})
export class AppModule {}
