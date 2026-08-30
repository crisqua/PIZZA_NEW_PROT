import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';

// Exportada separada de createApp() pra ser reaproveitada pelos testes e2e (Sprint 2) —
// eles sobem o AppModule via Test.createTestingModule(...) e precisam da MESMA config de
// producao (cookie-parser, CORS, prefixo v1), nao uma reimplementacao paralela.
export function configureApp(app: INestApplication): void {
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  // 'health' fora do prefixo pra nao quebrar o Health Check Path ja configurado no Render.
  app.setGlobalPrefix('v1', { exclude: ['health'] });
  app.enableShutdownHooks();
}

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  return app;
}
