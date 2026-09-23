import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CurrentTenant } from '../common/decorators/tenant.decorator';
import { TenantContextInterceptor } from '../common/interceptors/tenant-context.interceptor';
import { TenantTx } from '../prisma/tenant-context.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductUploadService } from './product-upload.service';
import { ProductsService } from './products.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(TenantContextInterceptor)
@Roles('tenant_owner', 'tenant_staff')
@Controller('catalog/products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly productUploadService: ProductUploadService,
  ) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @CurrentTenant() tx: TenantTx, @Body() dto: CreateProductDto) {
    if (!user.tenantId) {
      throw new ForbiddenException();
    }
    return this.productsService.create(tx, user.tenantId, dto);
  }

  // Sem uso de "tx" de proposito -- nao toca no banco, so' gera uma URL assinada pro
  // Supabase Storage (Sprint 16). O TenantContextInterceptor de classe ainda abre uma
  // transacao por request (baixo custo, endpoint pouco frequente, nao vale reestruturar
  // o controller so' por causa deste metodo).
  @Post('upload-url')
  createUploadUrl(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUploadUrlDto) {
    if (!user.tenantId) {
      throw new ForbiddenException();
    }
    return this.productUploadService.createSignedUploadUrl(user.tenantId, dto.fileName);
  }

  @Get()
  list(@CurrentTenant() tx: TenantTx) {
    return this.productsService.list(tx);
  }

  @Get(':id')
  findOne(@CurrentTenant() tx: TenantTx, @Param('id') id: string) {
    return this.productsService.findOne(tx, id);
  }

  @Patch(':id')
  update(@CurrentTenant() tx: TenantTx, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(tx, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentTenant() tx: TenantTx, @Param('id') id: string) {
    return this.productsService.remove(tx, id);
  }
}
