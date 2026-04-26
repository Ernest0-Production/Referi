import { trpc } from "@/trpc/server";
import { ResolveDisputeButtons } from "./ResolveDisputeButtons";

export default async function AdminDisputesPage() {
  const cases = await trpc.moderation.openCases();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Открытые споры</h1>
        <p className="mt-1 text-sm text-gray-500">
          {cases.length === 0
            ? "Нет открытых споров."
            : `${cases.length} спор(ов) ожидают решения.`}
        </p>
      </div>

      {cases.map((c) => (
        <div key={c.id} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900">
                {c.application.vacancy.title} — {c.application.vacancy.companyName}
              </p>
              <p className="mt-0.5 text-sm text-gray-500">
                Соискатель: {c.application.seeker.displayName ?? c.application.seeker.id}
              </p>
              <p className="text-xs text-gray-400">
                Заявка: <code className="rounded bg-gray-100 px-1">{c.application.id}</code>
              </p>
              <p className="text-xs text-gray-400">
                Спор открыт:{" "}
                {new Date(c.createdAt).toLocaleDateString("ru-RU", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
              {c.status}
            </span>
          </div>
          <ResolveDisputeButtons caseId={c.id} applicationId={c.application.id} />
        </div>
      ))}
    </div>
  );
}
