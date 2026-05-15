import Link from "next/link";
import { publicEnv } from "@/publicEnv";

const SITE_TAGLINE =
  "Платформа для безопасного реферального найма: эскроу-защита вознаграждения, прозрачный процесс, честные рефералы.";

const linkClass =
  "text-muted-foreground hover:text-foreground text-sm font-medium transition-colors";

export function SiteFooter() {
  const supportUrl = publicEnv.NEXT_PUBLIC_MODERATION_CONTACT_URL;

  return (
    <footer className="border-border bg-muted/40 border-t">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between sm:gap-10 lg:gap-12">
          <div className="flex max-w-xl min-w-0 flex-1 flex-col gap-3">
            <Link
              href="/"
              className="text-foreground flex w-fit shrink-0 items-center gap-2 font-bold tracking-tight"
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--app-search-accent-bg)] text-[var(--app-search-accent-fg)]"
                aria-hidden
              >
                <span className="text-lg leading-none">R</span>
              </span>
              <span className="text-lg">Referi</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">{SITE_TAGLINE}</p>
          </div>
          <nav
            aria-label="Юридическая информация и поддержка"
            className="flex w-full shrink-0 flex-col gap-2 text-left sm:w-auto sm:min-w-[11rem] sm:items-start sm:self-start"
          >
            {supportUrl ? (
              <a href={supportUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                Поддержка
              </a>
            ) : null}
            <Link href="/legal/offer" className={linkClass}>
              Оферта
            </Link>
            <Link href="/legal/terms" className={linkClass}>
              Условия
            </Link>
            <Link href="/legal/privacy" className={linkClass}>
              Конфиденциальность
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
