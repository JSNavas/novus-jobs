export interface MailConfig {
  apiKey: string;
  from: string;
  to: string;
}

export interface Mail {
  subject: string;
  html: string;
  text: string;
}

export class Mailer {
  constructor(private readonly config: MailConfig | null) {}

  enabled(): boolean {
    return this.config !== null;
  }

  async send(mail: Mail): Promise<boolean> {
    if (!this.config) {
      console.warn('[correo] sin configurar (RESEND_API_KEY / MAIL_FROM / MAIL_TO): no se envía nada');
      return false;
    }
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.config.from,
          to: [this.config.to],
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.error(`[correo] Resend lo rechazó (${response.status}): ${body.slice(0, 300)}`);
        return false;
      }
      console.log(`[correo] enviado: "${mail.subject}"`);
      return true;
    } catch (error) {
      console.error(`[correo] no se pudo enviar: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}
