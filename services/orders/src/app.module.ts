import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { PricingClient } from './pricing.client';
import { OrdersService } from './orders.service';
import { OrderEntity } from './entities/order.entity';
import { PackageEntity } from './entities/package.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const encryptValue = configService.get<string>('DB_ENCRYPT', 'true');
        const trustCertValue = configService.get<string>(
          'DB_TRUST_SERVER_CERTIFICATE',
          'true',
        );

        return {
          type: 'mssql',
          host: configService.get<string>('DB_HOST', 'localhost'),
          port: parseInt(
            configService.get<string>('DB_PORT', '1433'),
            10,
          ),
          username: configService.get<string>('DB_USERNAME', 'sa'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_DATABASE', 'QuetzalShip'),
          entities: [OrderEntity, PackageEntity],
          synchronize: false,
          options: {
            encrypt: encryptValue === 'true',
            trustServerCertificate: trustCertValue === 'true',
          },
        };
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([OrderEntity, PackageEntity]),
  ],
  controllers: [OrdersController],
  providers: [PricingClient, OrdersService],
})
export class AppModule {}
