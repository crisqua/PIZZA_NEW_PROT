import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CepLookupService } from '../common/cep-lookup.service';
import { UsersController } from './users.controller';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [CepLookupService],
})
export class UsersModule {}
