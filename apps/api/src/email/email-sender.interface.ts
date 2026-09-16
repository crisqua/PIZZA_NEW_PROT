// Interface desacoplada do provedor de envio (Sprint 14) -- provedor real ainda nao
// escolhido (decisao do usuario, fica pra depois). Trocar ConsoleEmailSender por
// ResendEmailSender/SmtpEmailSender/etc e' so' implementar esta interface e trocar o
// binding em AuthModule (token de injecao 'EMAIL_SENDER'), sem mexer no resto.
export interface EmailSender {
  send(to: string, subject: string, html: string): Promise<void>;
}

export const EMAIL_SENDER = 'EMAIL_SENDER';
