import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequiresModule } from '../module-gate/decorators/requires-module.decorator';
import { ModuleGuard } from '../module-gate/guards/module.guard';

// FIXTURE TEMPORARIO (Sprint 4) -- existe so' pra dar ao ModuleGuard uma rota HTTP real
// pro DoD ("teste automatizado, nao so' verificacao manual"), ja que inventory/financial
// (Sprint 6/8) ainda nao existem. Apagar este modulo e seu e2e spec quando a Sprint 6
// entregar a primeira rota real de /v1/inventory usando @RequiresModule('estoque').
@UseGuards(JwtAuthGuard, RolesGuard, ModuleGuard)
@Roles('tenant_owner', 'tenant_staff')
@Controller('_fixtures')
export class ModuleGateFixtureController {
  @Get('estoque-probe')
  @RequiresModule('estoque')
  probe() {
    return { ok: true };
  }
}
