import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModuleGateModule } from '../module-gate/module-gate.module';
import { ModuleGateFixtureController } from './module-gate-fixture.controller';

// FIXTURE TEMPORARIO -- ver comentario em module-gate-fixture.controller.ts. Apagar
// (e remover deste app.module.ts) quando /v1/inventory nascer na Sprint 6.
@Module({
  imports: [AuthModule, ModuleGateModule],
  controllers: [ModuleGateFixtureController],
})
export class ModuleGateFixtureModule {}
