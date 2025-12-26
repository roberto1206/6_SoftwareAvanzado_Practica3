import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Crear aplicación híbrida (HTTP + gRPC)
  const app = await NestFactory.create(AppModule);
  
  // Configurar microservicio gRPC
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'quetzalship.fx.v1',
      protoPath: '/app/contracts/proto/fx/fx.proto',
      url: '0.0.0.0:50055',
    },
  });
  
  // Enable CORS para HTTP
  app.enableCors();
  
  // Iniciar ambos servidores
  await app.startAllMicroservices();
  
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  
  logger.log(`FX Service running on:`);
  logger.log(`  - HTTP: http://localhost:${port}`);
  logger.log(`  - gRPC: localhost:50055`);
  logger.log(`Health endpoint: http://localhost:${port}/fx/health`);
}
bootstrap();
