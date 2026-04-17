/**
 * Email notification service — transactional emails (Phase 7).
 * Abstracted to support Mailgun, SendPulse, or any SMTP provider.
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailService {
  send(options: SendEmailOptions): Promise<void>;
}

class SmtpEmailService implements EmailService {
  async send(options: SendEmailOptions): Promise<void> {
    if (process.env.FEATURE_EMAIL !== "true") {
      console.log(
        `[Email] Skipped (FEATURE_EMAIL=false): "${options.subject}" → ${options.to}`,
      );
      return;
    }

    // TODO: integrate with Nodemailer + SMTP credentials
    // For now, log in development
    console.log(`[Email] Sending "${options.subject}" to ${options.to}`);
  }
}

export const emailService: EmailService = new SmtpEmailService();

// Email templates

export const emailTemplates = {
  registrationComplete: (data: { displayName: string }) => ({
    subject: "Добро пожаловать в Referi!",
    html: `
      <h1>Привет, ${data.displayName}!</h1>
      <p>Ваша регистрация на Referi прошла успешно.</p>
      <p>Теперь вы можете просматривать вакансии и откликаться на них.</p>
    `,
  }),

  newApplication: (data: { vacancyTitle: string; seekerName: string }) => ({
    subject: `Новый отклик на вакансию "${data.vacancyTitle}"`,
    html: `
      <h2>Новый отклик</h2>
      <p>Соискатель <b>${data.seekerName}</b> откликнулся на вашу вакансию "<b>${data.vacancyTitle}</b>".</p>
      <p>Перейдите в личный кабинет для просмотра деталей.</p>
    `,
  }),

  applicationStatusChanged: (data: {
    seekerName: string;
    vacancyTitle: string;
    newStatus: string;
  }) => ({
    subject: `Статус заявки изменился — ${data.vacancyTitle}`,
    html: `
      <h2>Обновление статуса</h2>
      <p>Ваша заявка на вакансию "<b>${data.vacancyTitle}</b>" перешла в статус: <b>${data.newStatus}</b>.</p>
      <p>Перейдите в личный кабинет для получения подробной информации.</p>
    `,
  }),

  refundIssued: (data: {
    seekerName: string;
    amountRub: string;
    reason: string;
  }) => ({
    subject: "Возврат средств выполнен",
    html: `
      <h2>Возврат средств</h2>
      <p>Уважаемый ${data.seekerName},</p>
      <p>Возврат в размере <b>${data.amountRub} ₽</b> был инициирован.</p>
      <p>Причина: ${data.reason}</p>
      <p>Средства поступят на вашу карту в течение 10 рабочих дней.</p>
    `,
  }),

  payoutInitiated: (data: { referrerName: string; amountRub: string }) => ({
    subject: "Выплата вознаграждения",
    html: `
      <h2>Ваше вознаграждение</h2>
      <p>Уважаемый ${data.referrerName},</p>
      <p>Выплата в размере <b>${data.amountRub} ₽</b> инициирована на вашу карту.</p>
    `,
  }),
};
