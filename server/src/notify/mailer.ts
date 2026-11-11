/**
 * Enviar correo. Lo único que sale de esta máquina hacia el usuario.
 *
 * VÍA RESEND, y por HTTP a pelo, sin SDK: no hace falta cuenta ni
 * factura, así que no se añade ninguna de las dos. Y una llamada `fetch` evita
 * meter `nodemailer` y un cliente SMTP entero por mandar tres correos al día.
 *
 * NO REINTENTA, y es deliberado. Si el envío falla se registra y se acabó: un
 * reintento ciego con correo es la receta para mandarle la misma oferta cinco
 * veces, y el destinatario es su bandeja personal. Perder un aviso es molesto;
 * inundarle es peor y no se deshace.
 *
 * NUNCA LANZA. Quien llama está dentro de una pasada programada, y una
 * excepción aquí mataría la pasada —y las ofertas ya guardadas— por no haber
 * podido mandar un correo.
 */
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
        // El cuerpo del error de Resend dice el motivo real (dominio sin
        // verificar, clave mala…). Sin él, "falló el correo" no se arregla.
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
