import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './cache/cache.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { ModuleGateModule } from './module-gate/module-gate.module';
import { ModuleGateFixtureModule } from './module-gate-fixture/module-gate-fixture.module';
import { PlansAdminModule } from './plans-admin/plans-admin.module';
import { SubscriptionsAdminModule } from './subscriptions-admin/subscriptions-admin.module';
import { TenantsAdminModule } from './tenants-admin/tenants-admin.module';
import { TenantsModule } from './tenants/tenants.module';
import { TenantsPublicModule } from './tenants-public/tenants-public.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    CacheModule,
    AuthModule,
    UsersModule,
    AdminModule,
    TenantsAdminModule,
    TenantsModule,
    TenantsPublicModule,
    PlansAdminModule,
    SubscriptionsAdminModule,
    ModuleGateModule,
    // FIXTURE TEMPORARIO -- remover quando /v1/inventory nascer (Sprint 6).
    ModuleGateFixtureModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
