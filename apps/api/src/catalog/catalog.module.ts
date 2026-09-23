import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { ProductUploadService } from './product-upload.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [AuthModule],
  controllers: [CategoriesController, ProductsController],
  providers: [CategoriesService, ProductsService, ProductUploadService],
})
export class CatalogModule {}
