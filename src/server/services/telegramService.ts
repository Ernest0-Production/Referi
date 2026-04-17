/**
 * Telegram Bot integration — spec/spec-tool-telegram-bot.md
 */

export interface SendMessageOptions {
  chatId: number | string;
  text: string;
  parseMode?: "HTML";
  replyMarkup?: unknown;
}

export interface TelegramService {
  sendMessage(options: SendMessageOptions): Promise<void>;
  answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void>;
  setWebhook(url: string, secretToken: string): Promise<void>;
}

class TelegramServiceImpl implements TelegramService {
  private get token(): string {
    return process.env.TELEGRAM_BOT_TOKEN ?? "";
  }

  private get apiUrl(): string {
    return `https://api.telegram.org/bot${this.token}`;
  }

  async sendMessage(options: SendMessageOptions): Promise<void> {
    if (!this.token) {
      console.warn(
        "[Telegram] TELEGRAM_BOT_TOKEN not set; skipping sendMessage",
      );
      return;
    }

    try {
      const res = await fetch(`${this.apiUrl}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: options.chatId,
          text: options.text,
          parse_mode: options.parseMode ?? "HTML",
          reply_markup: options.replyMarkup,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[Telegram] sendMessage failed:", err);
      }
    } catch (err) {
      // Non-critical: log and continue
      console.error("[Telegram] sendMessage network error:", err);
    }
  }

  async answerCallbackQuery(
    callbackQueryId: string,
    text?: string,
  ): Promise<void> {
    if (!this.token) return;
    try {
      await fetch(`${this.apiUrl}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
      });
    } catch (err) {
      console.error("[Telegram] answerCallbackQuery error:", err);
    }
  }

  async setWebhook(url: string, secretToken: string): Promise<void> {
    if (!this.token) {
      console.warn(
        "[Telegram] TELEGRAM_BOT_TOKEN not set; skipping setWebhook",
      );
      return;
    }
    try {
      const res = await fetch(`${this.apiUrl}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, secret_token: secretToken }),
      });
      const data = (await res.json()) as { ok: boolean; description?: string };
      if (!data.ok) {
        console.error("[Telegram] setWebhook failed:", data.description);
      } else {
        console.log("[Telegram] Webhook registered:", url);
      }
    } catch (err) {
      console.error("[Telegram] setWebhook network error:", err);
    }
  }

  async notifyModerators(text: string): Promise<void> {
    const chatId = process.env.TELEGRAM_MODERATOR_CHAT_ID;
    if (!chatId) return;
    await this.sendMessage({ chatId, text });
  }
}

export const telegramService = new TelegramServiceImpl();
