import { BadRequestException, INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CepLookupService } from '../../src/common/cep-lookup.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';

// Mesma dupla checagem do checkout (Sprint 12), agora em PATCH /users/me
// (UsersController.updateMe) -- CepLookupService mockado, nunca bate no ViaCEP de
// verdade num teste automatizado.
describe('PATCH /v1/users/me -- CEP (Sprint 12)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let tenant: SeededTenantUser;
  let token: string;
  let cepLookupMock: jest.Mock;

  beforeAll(async () => {
    cepLookupMock = jest.fn().mockResolvedValue({ address: 'Rua Resolvida', neighborhood: 'Bairro Resolvido', city: 'Cidade Resolvida', state: 'RR' });
    app = await createTestApp((builder) =>
      builder.overrideProvider(CepLookupService).useValue({ resolve: cepLookupMock }),
    );
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);
    tenant = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'me-cep', role: 'customer' });

    const login = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: tenant.email, password: tenant.password, tenantSlug: tenant.tenantSlug })
      .expect(200);
    token = login.body.accessToken;
  });

  afterAll(async () => {
    await cleanupTenantWithUser(prisma, tenantContext, tenant);
    await app.close();
  });

  it('CEP valido resolve e sobrescreve address/neighborhood/city/state, mesmo com valores forjados no body', async () => {
    const res = await request(app.getHttpServer())
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ cep: '01310-100', address: 'Rua Forjada', neighborhood: 'Bairro Forjado' })
      .expect(200);

    expect(res.body.cep).toBe('01310-100');
    expect(res.body.address).toBe('Rua Resolvida');
    expect(res.body.neighborhood).toBe('Bairro Resolvido');
    expect(res.body.city).toBe('Cidade Resolvida');
    expect(res.body.state).toBe('RR');
  });

  it('round-trip: PATCH -> GET /users/me confirma que os 3 campos persistiram', async () => {
    const get = await request(app.getHttpServer())
      .get('/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(get.body.cep).toBe('01310-100');
    expect(get.body.city).toBe('Cidade Resolvida');
    expect(get.body.state).toBe('RR');
  });

  it('CEP mal formatado retorna 400', async () => {
    await request(app.getHttpServer())
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ cep: 'abc' })
      .expect(400);
  });

  it('CEP inexistente (ViaCEP responde {erro:true}) retorna 400', async () => {
    cepLookupMock.mockRejectedValueOnce(new BadRequestException('CEP nao encontrado.'));
    await request(app.getHttpServer())
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ cep: '00000-000' })
      .expect(400);
  });

  it('ViaCEP fora do ar (fail-open): perfil salva com o que o cliente mandou', async () => {
    cepLookupMock.mockResolvedValueOnce(null);
    const res = await request(app.getHttpServer())
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ cep: '02010-000', address: 'Rua Sem ViaCEP', neighborhood: 'Bairro Sem ViaCEP', city: 'Cidade Sem ViaCEP', state: 'SV' })
      .expect(200);

    expect(res.body.cep).toBe('02010-000');
    expect(res.body.address).toBe('Rua Sem ViaCEP');
    expect(res.body.neighborhood).toBe('Bairro Sem ViaCEP');
    expect(res.body.city).toBe('Cidade Sem ViaCEP');
    expect(res.body.state).toBe('SV');
  });

  it('atualizar o perfil sem mandar CEP nao chama o CepLookupService', async () => {
    cepLookupMock.mockClear();
    await request(app.getHttpServer())
      .patch('/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Nome Sem CEP' })
      .expect(200);

    expect(cepLookupMock).not.toHaveBeenCalled();
  });
});
