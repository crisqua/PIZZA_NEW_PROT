import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ListTenantsQueryDto } from './dto/list-tenants-query.dto';
import { OnboardTenantDto } from './dto/onboard-tenant.dto';
import { ToggleTenantActiveDto } from './dto/toggle-tenant-active.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantOnboardingService } from './tenant-onboarding.service';
import { TenantsAdminService } from './tenants-admin.service';

// "tenants" nao tem RLS (ver schema.prisma) -- sem TenantContextInterceptor de proposito,
// so' JwtAuthGuard+RolesGuard, igual AdminController (Sprint 2).
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('platform_superadmin')
@Controller('admin/tenants')
export class TenantsAdminController {
  constructor(
    private readonly tenantsAdminService: TenantsAdminService,
    private readonly tenantOnboardingService: TenantOnboardingService,
  ) {}

  @Post()
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsAdminService.create(dto);
  }

  // Rota fixa "onboard" nao colide com "GET/PATCH :id" (metodos HTTP diferentes, e Nest
  // casa por segmento literal antes de parametro de qualquer forma).
  @Post('onboard')
  onboard(@Body() dto: OnboardTenantDto) {
    return this.tenantOnboardingService.onboard(dto);
  }

  @Get()
  list(@Query() query: ListTenantsQueryDto) {
    return this.tenantsAdminService.list(query.page ?? 1, query.pageSize ?? 20);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantsAdminService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenantsAdminService.update(id, dto);
  }

  @Patch(':id/active')
  setActive(@Param('id') id: string, @Body() dto: ToggleTenantActiveDto) {
    return this.tenantsAdminService.setActive(id, dto.active);
  }
}
