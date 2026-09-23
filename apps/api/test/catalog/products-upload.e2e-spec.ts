import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ProductUploadService } from '../../src/catalog/product-upload.service';
import { hashPassword } from '../../src/common/password.util';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TenantContextService } from '../../src/prisma/tenant-context.service';
import { createTestApp } from '../utils/create-test-app';
import { cleanupTenantWithUser, seedTenantWithUser, SeededTenantUser } from '../utils/seed-auth-fixtures';

// ProductUploadService fala com o Supabase Storage de verdade -- mockado aqui (mesmo
// padrao de CepLookupService nos testes de pedido), nao faz sentido bater no storage
// real a cada rodada de CI.
describe('POST /v1/catalog/products/upload-url', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantContext: TenantContextService;
  let tenantA: SeededTenantUser;
  let customerEmail: string;
  let customerPassword: string;
  let ownerToken: string;
  let customerToken: string;
  let uploadMock: jest.Mock;

  beforeAll(async () => {
    uploadMock = jest.fn().mockResolvedValue({
      uploadUrl: 'https://example.supabase.co/storage/v1/upload/signed/fake',
      publicUrl: 'https://example.supabase.co/storage/v1/object/public/product-images/fake.jpg',
    });
    app = await createTestApp((builder) =>
      builder.overrideProvider(ProductUploadService).useValue({ createSignedUploadUrl: uploadMock }),
    );
    prisma = app.get(PrismaService);
    tenantContext = app.get(TenantContextService);

    tenantA = await seedTenantWithUser(prisma, tenantContext, { slugPrefix: 'upl-a', role: 'tenant_owner' });

    // Cliente do mesmo tenant, criado direto (seedTenantWithUser sempre cria um tenant
    // NOVO, nao serve pra anexar um segundo usuario ao tenant ja existente).
    customerEmail = `customer@${tenantA.tenantSlug}.test`;
    customerPassword = randomUUID();
    const customerPasswordHash = await hashPassword(customerPassword);
    await tenantContext.runInTenantContext(tenantA.tenantId, (tx) =>
      tx.user.create({
        data: { tenantId: tenantA.tenantId, email: customerEmail, name: 'Cliente', role: 'customer', passwordHash: customerPasswordHash },
      }),
    );

    const ownerLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: tenantA.email, password: tenantA.password, tenantSlug: tenantA.tenantSlug })
      .expect(200);
    ownerToken = ownerLogin.body.accessToken;

    const customerLogin = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .send({ email: customerEmail, password: customerPassword, tenantSlug: tenantA.tenantSlug })
      .expect(200);
    customerToken = customerLogin.body.accessToken;
  });

  afterAll(async () => {
    await cleanupTenantWithUser(prisma, tenantContext, tenantA);
    await app.close();
  });

  it('dono consegue pedir URL de upload pra um contentType valido', async () => {
    const res = await request(app.getHttpServer())
      .post('/v1/catalog/products/upload-url')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ fileName: 'calabresa.jpg', contentType: 'image/jpeg' })
      .expect(201);

    expect(res.body.uploadUrl).toContain('supabase.co');
    expect(res.body.publicUrl).toContain('supabase.co');
    expect(uploadMock).toHaveBeenCalledWith(tenantA.tenantId, 'calabresa.jpg');
  });

  it('contentType fora da lista permitida retorna 400', async () => {
    await request(app.getHttpServer())
      .post('/v1/catalog/products/upload-url')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ fileName: 'arquivo.txt', contentType: 'text/plain' })
      .expect(400);
  });

  it('customer nao pode (403)', async () => {
    await request(app.getHttpServer())
      .post('/v1/catalog/products/upload-url')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ fileName: 'calabresa.jpg', contentType: 'image/jpeg' })
      .expect(403);
  });

  it('sem token retorna 401', async () => {
    await request(app.getHttpServer())
      .post('/v1/catalog/products/upload-url')
      .send({ fileName: 'calabresa.jpg', contentType: 'image/jpeg' })
      .expect(401);
  });
});
