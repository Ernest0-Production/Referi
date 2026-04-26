import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { telegramMessages } from "@/shared/telegram/messages";
import { telegramService } from "@/server/services/telegramService";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; username?: string; first_name?: string };
    chat: { id: number };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number };
    data?: string;
  };
}

export async function POST(request: Request) {
  const secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // Process asynchronously
  void processTelegramUpdate(update);

  return new Response("OK", { status: 200 });
}

async function processTelegramUpdate(update: TelegramUpdate) {
  try {
    const { message } = update;
    if (!message?.text) return;

    const chatId = message.chat.id;
    const text = message.text.trim();
    const telegramUserId = message.from?.id;

    if (!telegramUserId) return;

    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const token = parts[1];

      if (token) {
        await handleLinkAccount(chatId, telegramUserId, message.from?.username, token);
      } else {
        await telegramService.sendMessage({
          chatId,
          text:
            "<b>Добро пожаловать в Referi!</b>\n\n" +
            "Для привязки аккаунта перейдите по ссылке с сайта Referi.\n\n" +
            "Команды:\n" +
            "/help — список команд\n" +
            "/status — статус ваших заявок",
        });
      }
    } else if (text.startsWith("/link ")) {
      // Explicit /link {token} command as alternative to deep-link /start
      const token = text.slice("/link ".length).trim();
      if (token) {
        await handleLinkAccount(chatId, telegramUserId, message.from?.username, token);
      } else {
        await telegramService.sendMessage({
          chatId,
          text: "Укажите токен: /link <code>TOKEN</code>",
        });
      }
    } else if (text === "/help") {
      await telegramService.sendMessage({
        chatId,
        text:
          "<b>Доступные команды:</b>\n\n" +
          "/start — начало работы\n" +
          "/status — статус активных заявок\n" +
          "/help — эта справка",
      });
    } else if (text === "/status") {
      await handleStatusCommand(chatId, telegramUserId);
    } else if (text.startsWith("/resolve_referrer ") || text.startsWith("/resolve_seeker ")) {
      await handleModeratorCommand(chatId, telegramUserId);
    }
  } catch (err) {
    console.error("[Telegram] Update processing error:", err);
  }
}

async function handleLinkAccount(
  chatId: number,
  telegramUserId: number,
  telegramUsername: string | undefined,
  token: string,
) {
  const linkToken = await prisma.telegramLinkToken.findUnique({
    where: { token },
  });

  if (!linkToken || linkToken.expiresAt < new Date()) {
    await telegramService.sendMessage({
      chatId,
      text: telegramMessages.linkTokenExpired(),
    });
    return;
  }

  // Create or update TelegramLink
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.telegramLink.upsert({
      where: { userId: linkToken.userId },
      create: {
        userId: linkToken.userId,
        telegramUserId: BigInt(telegramUserId),
        telegramUsername: telegramUsername ?? null,
        chatId: BigInt(chatId),
      },
      update: {
        telegramUserId: BigInt(telegramUserId),
        telegramUsername: telegramUsername ?? null,
        chatId: BigInt(chatId),
      },
    });
    await tx.telegramLinkToken.delete({ where: { id: linkToken.id } });
  });

  await telegramService.sendMessage({
    chatId,
    text: telegramMessages.accountLinked(),
  });
}

async function handleStatusCommand(chatId: number, telegramUserId: number) {
  const link = await prisma.telegramLink.findFirst({
    where: { telegramUserId: BigInt(telegramUserId) },
  });

  if (!link) {
    await telegramService.sendMessage({
      chatId,
      text: "Аккаунт не привязан. Перейдите по ссылке с сайта Referi для привязки.",
    });
    return;
  }

  const activeApps = await prisma.application.findMany({
    where: {
      seekerId: link.userId,
      status: {
        in: [
          "SUBMITTED",
          "AWAITING_PAYMENT",
          "AWAITING_RESUME_HANDOFF",
          "SEEKER_CANCEL_REQUESTED",
          "AWAITING_COMPANY_DECISION",
          "DISPUTED",
        ],
      },
    },
    include: { vacancy: { select: { title: true, companyName: true } } },
    take: 5,
  });

  if (activeApps.length === 0) {
    await telegramService.sendMessage({
      chatId,
      text: "У вас нет активных заявок.",
    });
    return;
  }

  const lines = activeApps.map(
    (app) => `• <b>${app.vacancy.title}</b> (${app.vacancy.companyName}) — <i>${app.status}</i>`,
  );

  await telegramService.sendMessage({
    chatId,
    text: `<b>Ваши активные заявки:</b>\n\n${lines.join("\n")}`,
  });
}

async function handleModeratorCommand(chatId: number, telegramUserId: number) {
  // Verify this user is a moderator
  const link = await prisma.telegramLink.findFirst({
    where: { telegramUserId: BigInt(telegramUserId) },
    include: { user: { select: { roles: true } } },
  });

  if (!link?.user.roles.includes("MODERATOR") && !link?.user.roles.includes("ADMIN")) {
    await telegramService.sendMessage({
      chatId,
      text: "Недостаточно прав.",
    });
    return;
  }

  await telegramService.sendMessage({
    chatId,
    text: "Для разрешения споров используйте admin-панель на сайте Referi.",
  });
}
