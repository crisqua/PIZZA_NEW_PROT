import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

// Padrao novo (Sprint 2): sobe a app real via HTTP pra testar guards/interceptors, ao
// contrario dos specs de isolamento da Sprint 1 (que chamam PrismaService direto, sem
// pipeline de requisicao). Usa exatamente configureApp() — o mesmo caminho de producao,
// nao uma reimplementacao paralela de cookie-parser/CORS/prefixo.
export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}
