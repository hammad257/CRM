import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CRM API')
    .setDescription('Authentication, users, and identity & access management')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('App')
    .addTag('Authentication')
    .addTag('Users')
    .addTag('Identity & access — Roles')
    .addTag('Identity & access — Permissions')
    .addTag('Leads')
    .addTag('Customers')
    .addTag('Public — Customer inquiries')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
