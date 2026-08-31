import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlansAdminService } from './plans-admin.service';

// "plans" nao tem RLS -- sem TenantContextInterceptor de proposito, so' JwtAuthGuard+
// RolesGuard, igual TenantsAdminController.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('platform_superadmin')
@Controller('admin/plans')
export class PlansAdminController {
  constructor(private readonly plansAdminService: PlansAdminService) {}

  @Post()
  create(@Body() dto: CreatePlanDto) {
    return this.plansAdminService.create(dto);
  }

  @Get()
  list() {
    return this.plansAdminService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.plansAdminService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansAdminService.update(id, dto);
  }
}
