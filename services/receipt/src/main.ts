import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  // Detectar si estamos en Docker o local
  const protoPath =
    process.env.NODE_ENV === 'production'
      ? join(__dirname, '../contracts/proto/receipt/receipt.proto') // Docker: 1 nivel arriba
      : join(__dirname, '../../../contracts/proto/receipt/receipt.proto'); // Local: 3 niveles arriba

  const includeDir =
    process.env.NODE_ENV === 'production'
      ? join(__dirname, '../contracts/proto') // Docker
      : join(__dirname, '../../../contracts/proto'); // Local

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      url: '0.0.0.0:50054',
      package: 'quetzalship.receipt.v1',
      protoPath,
      loader: {
        keepCase: true,
        includeDirs: [includeDir],
      },
    },
  });

  await app.listen();
  console.log('🚀 Receipt microservice is listening on port 50054');
  console.log();
}

void bootstrap();