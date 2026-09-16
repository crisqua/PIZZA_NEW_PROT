import { Injectable, Logger } from '@nestjs/common';
import { EmailSender } from './email-sender.interface';

// Implementacao default ate um provedor de verdade ser escolhido (Sprint 14) -- so' loga
// o link no console do backend, permite testar o fluxo inteiro local sem enviar e-mail
// real nenhum.
@Injectable()
export class ConsoleEmailSender implements EmailSender {
  private readonly logger = new Logger(ConsoleEmailSender.name);

  async send(to: string, subject: string, html: string): Promise<void> {
    this.logger.log(`[EMAIL pra ${to}] ${subject}\n${html}`);
  }
}
