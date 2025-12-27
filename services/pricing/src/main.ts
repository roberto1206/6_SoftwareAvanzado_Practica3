import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // Detectar si estamos en Docker o local
  const protoPath =
    process.env.NODE_ENV === 'production'
      ? join(__dirname, '../contracts/proto/pricing/pricing.proto') // Docker: solo 1 nivel arriba
      : join(__dirname, '../../../contracts/proto/pricing/pricing.proto'); // Local: 3 niveles arriba

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        url: '0.0.0.0:50052',
        package: 'quetzalship.pricing.v1',
        protoPath,
        loader: {
          keepCase: true,
        },
      },
    },
  );

  await app.listen();
  console.log('🚀 Pricing microservice is listening on port 50052');
  console.log();
}

void bootstrap();
