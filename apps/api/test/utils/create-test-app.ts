import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';

// Padrao novo (Sprint 2): sobe a app real via HTTP pra testar guards/interceptors, ao
// contrario dos specs de isolamento da Sprint 1 (que chamam PrismaService direto, sem
// pipeline de requisicao). Usa exatamente configureApp() — o mesmo caminho de producao,
// nao uma reimplementacao paralela de cookie-parser/CORS/prefixo.
//
// "configure" opcional (Sprint 12): permite overrideProvider(...) antes do compile() --
// primeiro uso real e' CepLookupService nos testes de CEP (nao da' pra bater no ViaCEP
// de verdade num teste automatizado). Callers existentes nao passam nada, comportamento
// inalterado.
export async function createTestApp(
  configure?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<INestApplication> {
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (configure) {
    builder = configure(builder);
  }
  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}
