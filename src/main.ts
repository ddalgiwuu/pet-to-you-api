import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './shared/filters/all-exceptions.filter';
import { LoggingInterceptor } from './shared/interceptors/logging.interceptor';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api'); // v1 comes from versioning

  // 🔒 Security Headers (Helmet)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      xssFilter: true,
      hidePoweredBy: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // 🔒 CORS Configuration
  const corsOrigins = configService
    .get<string>('CORS_ORIGINS', 'http://localhost:3000')
    .split(',');

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 3600, // 1 hour
  });

  // 🔒 Global Validation Pipe (Input validation)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
    }),
  );

  // 🔒 Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // 📊 Global Interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // 🔄 API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // 🌐 API Prefix
  app.setGlobalPrefix(apiPrefix);

  // 📚 Swagger/OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Pet to You API')
    .setDescription(
      'RESTful API for Pet to You - Hospital and Business Dashboard Platform\n\n' +
        '## Features\n' +
        '- 🏥 Hospital Dashboard: Statistics, pets, appointments, revenue, reviews\n' +
        '- 🏢 Business Dashboard: Services, bookings, customers, capacity tracking\n' +
        '- 🔒 Security: JWT authentication, RBAC, multi-tenant isolation\n' +
        '- ⚡ Performance: Redis caching, MongoDB aggregations, pagination\n\n' +
        '## Authentication\n' +
        'Use JWT Bearer tokens obtained from /api/v1/auth/login endpoint.\n\n' +
        '## Rate Limiting\n' +
        '100 requests per 15 minutes per IP address.',
    )
    .setVersion('1.0')
    .setContact(
      'Pet to You Team',
      'https://pet-to-you.com',
      'support@pet-to-you.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Hospital Dashboard', 'Hospital statistics, pets, appointments, revenue')
    .addTag('Business Dashboard', 'Business services, bookings, customers, revenue')
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Pets', 'Pet registration and management')
    .addTag('Bookings', 'Appointment and service bookings')
    .addServer(`http://localhost:${port}/${apiPrefix}`, 'Development server')
    .addServer('https://api.pet-to-you.com/api', 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,
  });

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0 }
      .swagger-ui .scheme-container { margin: 20px 0; padding: 15px; background: #fafafa; border-radius: 4px }
    `,
    customSiteTitle: 'Pet to You API Documentation',
  });

  // 🚦 Graceful Shutdown
  app.enableShutdownHooks();

  await app.listen(port);

  console.log(`
  🚀 Pet to You API Server Started
  ====================================
  📍 Environment: ${configService.get('NODE_ENV')}
  🌐 URL: http://localhost:${port}/${apiPrefix}
  📚 OpenAPI: http://localhost:${port}/${apiPrefix}/docs
  🔒 Security: Helmet + CORS enabled
  ⏱️  Rate Limit: 100 req/15min
  ====================================
  `);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
