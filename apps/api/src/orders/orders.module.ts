import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { CepLookupService } from '../common/cep-lookup.service';
import { tenantThrottlerTracker } from '../common/tenant-throttler-tracker';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

// Rate limiting (Sprint 15) escopado SO' a este modulo -- ThrottlerModule.forRoot aqui
// dentro (nao em AppModule) registra os limites nomeados sem afetar nenhuma outra rota
// do sistema, so' onde o guard e' aplicado explicitamente (OrdersController.create).
// TTL em milissegundos (API do @nestjs/throttler v6).
//
// "limit" e' uma FUNCAO (nao um numero fixo lido uma vez), de proposito: a suite e2e
// inteira roda como 1 unico processo Node com --runInBand, e varios arquivos de teste
// (orders-crud, idempotency) legitimamente criam mais de 10 pedidos na mesma suite --
// se o limite fosse lido uma vez so' na carga do modulo, esses testes tomariam 429 por
// engano. Lendo a env var a cada requisicao, so' o arquivo de teste do rate limit em si
// (rate-limit.e2e-spec.ts) precisa abaixar o valor pra si mesmo (via
// process.env.RATE_LIMIT_IP_PER_MIN dentro do proprio beforeAll), sem exigir nenhum
// truque de cache de modulo do Jest. Em producao isso nao muda nada -- e' so' uma
// leitura de env var por requisicao em vez de uma vez no boot, custo irrelevante.
const IP_LIMIT_PER_MIN = () => Number(process.env.RATE_LIMIT_IP_PER_MIN ?? 10);
const TENANT_LIMIT_PER_MIN = () => Number(process.env.RATE_LIMIT_TENANT_PER_MIN ?? 30);

@Module({
  imports: [
    AuthModule,
    AuditLogModule,
    ThrottlerModule.forRoot([
      { name: 'ip', ttl: 60_000, limit: IP_LIMIT_PER_MIN },
      { name: 'tenant', ttl: 60_000, limit: TENANT_LIMIT_PER_MIN, getTracker: tenantThrottlerTracker },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, CepLookupService],
})
export class OrdersModule {}
