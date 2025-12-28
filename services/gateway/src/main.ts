import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();

  // ============================================
  // CONFIGURACIÓN DE SWAGGER/OPENAPI
  // ============================================
  const config = new DocumentBuilder()
    .setTitle('orders API')
    .setDescription('API Gateway para el sistema de órdenes de envío QuetzalShip')
    .setVersion('1.0.0')
    .setContact(
      'QuetzalShip Team',
      '',
      '3008431000101@ingenieria.usac.edu.gt'
    )
    .addTag('orders', 'Operaciones de órdenes de envío')
    .addTag('health', 'Health checks del sistema')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Swagger UI
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'QuetzalShip API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  // Endpoint JSON
  app.use('/api-docs-json', (req, res) => {
    res.json(document);
  });

  // ============================================
  // EXPORTAR CONTRATO OPENAPI A YAML
  // ============================================
  try {
    // Detectar si estamos en Docker o local (igual que tu protoPath)
    const contractsDir =
      process.env.NODE_ENV === 'production'
        ? path.join(__dirname, '../contracts/openapi') // Docker: 1 nivel arriba
        : path.join(__dirname, '../../../contracts/openapi'); // Local: 3 niveles arriba
    
    console.log(`📁 Attempting to create OpenAPI contract in: ${contractsDir}`);
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   __dirname: ${__dirname}`);
    
    // Crear directorio si no existe
    if (!fs.existsSync(contractsDir)) {
      fs.mkdirSync(contractsDir, { recursive: true });
      console.log(`   ✓ Created directory: ${contractsDir}`);
    } else {
      console.log(`   ✓ Directory already exists`);
    }

    const yamlDocument = yaml.dump(document, { noRefs: true });
    const yamlPath = path.join(contractsDir, 'quetzalship-gateway.yaml');
    
    fs.writeFileSync(yamlPath, yamlDocument);
    console.log(`📄 ✓ OpenAPI contract exported successfully!`);
    console.log(`   File: ${yamlPath}`);
    console.log(`   Resolved path: ${path.resolve(yamlPath)}`);
  } catch (error) {
    console.error('⚠  Failed to export OpenAPI contract:');
    console.error(`   Error: ${error instanceof Error ? error.message : error}`);
    console.error(`   Stack: ${error instanceof Error ? error.stack : 'N/A'}`);
  }

  await app.listen(3000);
  console.log('🚀 Gateway HTTP service is listening on port 3000');
  console.log('📚 Swagger UI: http://localhost:3000/api-docs');
  console.log('📄 Swagger JSON: http://localhost:3000/api-docs-json');
  console.log('');
}

void bootstrap();
