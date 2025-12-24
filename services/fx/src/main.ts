import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors();
  
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  
  logger.log(`FX Service running on port ${port}`);
  logger.log(`Health endpoint: http://localhost:${port}/fx/health`);
}
bootstrap();
