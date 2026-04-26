import { trpc } from "@/trpc/server";
import { ResolveReportButton } from "./ResolveReportButton";

export default async function AdminReportsPage() {
  const reports = await trpc.moderation.abuseReports({ resolved: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Жалобы</h1>
        <p className="mt-1 text-sm text-gray-500">
          {reports.length === 0
            ? "Нет нерассмотренных жалоб."
            : `${reports.length} жалоб(а) ожидают рассмотрения.`}
        </p>
      </div>

      {reports.map((r) => (
        <div key={r.id} className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900">
                {r.reason}
                {r.vacancy && (
                  <span className="ml-2 font-normal text-gray-500">— {r.vacancy.title}</span>
                )}
              </p>
              <p className="mt-0.5 text-sm text-gray-500">
                От: {r.reporter.displayName ?? r.reporter.id}
              </p>
              {r.comment && <p className="mt-1 text-sm text-gray-600">«{r.comment}»</p>}
              <p className="text-xs text-gray-400">
                {new Date(r.createdAt).toLocaleDateString("ru-RU", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
              Новая
            </span>
          </div>
          <ResolveReportButton reportId={r.id} vacancyId={r.vacancyId ?? undefined} />
        </div>
      ))}
    </div>
  );
}
