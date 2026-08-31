import { Module } from '@nestjs/common';
import { CatalogPublicController } from './catalog-public.controller';

@Module({
  controllers: [CatalogPublicController],
})
export class CatalogPublicModule {}
