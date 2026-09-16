import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConsoleEmailSender } from '../email/console-email-sender.service';
import { EMAIL_SENDER } from '../email/email-sender.interface';
import { EmailVerificationService } from '../email/email-verification.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  // Sem secret/expiresIn global de proposito: access e refresh usam segredos diferentes,
  // passados por chamada em jwtService.signAsync/verifyAsync (ver AuthService).
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    EmailVerificationService,
    // Token de injecao por string (nao a classe direta) -- e' isso que permite trocar
    // por ResendEmailSender/SmtpEmailSender/etc no dia que o provedor for escolhido,
    // mudando so' esta linha (Sprint 14).
    { provide: EMAIL_SENDER, useClass: ConsoleEmailSender },
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule],
})
export class AuthModule {}
