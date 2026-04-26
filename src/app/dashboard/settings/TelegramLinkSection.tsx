"use client";

import { useState } from "react";
import { trpcReact } from "@/trpc/client";

interface Props {
  telegramLink: {
    telegramUsername: string | null;
    createdAt: Date;
  } | null;
}

export function TelegramLinkSection({ telegramLink }: Props) {
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateLink = trpcReact.auth.generateTelegramLinkToken.useMutation({
    onSuccess: (data) => setDeepLink(data.deepLink),
  });

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6">
      <h2 className="font-semibold text-gray-800">Telegram</h2>

      {telegramLink ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              Привязан
            </span>
            {telegramLink.telegramUsername && (
              <span className="text-sm text-gray-600">@{telegramLink.telegramUsername}</span>
            )}
          </div>
          <p className="text-xs text-gray-400">
            Привязан{" "}
            {new Date(telegramLink.createdAt).toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="text-sm text-gray-500">
            Вы будете получать уведомления о ключевых событиях через Telegram.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Привяжите Telegram для получения уведомлений о новых откликах, изменениях статусов и
            выплатах.
          </p>

          {deepLink ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Перейдите по ссылке в Telegram и нажмите «Старт»:
              </p>
              <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                <a
                  href={deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate text-sm text-blue-700 hover:underline"
                >
                  {deepLink}
                </a>
                <button
                  onClick={() => handleCopy(deepLink)}
                  className="shrink-0 text-xs text-gray-500 hover:text-gray-700"
                >
                  {copied ? "Скопировано!" : "Копировать"}
                </button>
              </div>
              <p className="text-xs text-gray-400">Ссылка действительна 15 минут.</p>
              <button
                onClick={() => {
                  setDeepLink(null);
                  generateLink.mutate();
                }}
                className="text-xs text-blue-600 hover:underline"
              >
                Сгенерировать новую ссылку
              </button>
            </div>
          ) : (
            <button
              onClick={() => generateLink.mutate()}
              disabled={generateLink.isPending}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {generateLink.isPending ? "Генерация…" : "Привязать Telegram"}
            </button>
          )}

          {generateLink.error && (
            <p className="text-sm text-red-500">{generateLink.error.message}</p>
          )}
        </div>
      )}
    </section>
  );
}
