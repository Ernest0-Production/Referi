import Link from "next/link";

const SPECIALTY_LABELS: Record<string, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  FULLSTACK: "Fullstack",
  MOBILE: "Mobile",
  DEVOPS: "DevOps",
  QA: "QA",
  DATA: "Data",
  ML_AI: "ML/AI",
  SECURITY: "Security",
  OTHER: "Другое",
};

const GRADE_LABELS: Record<string, string> = {
  JUNIOR: "Junior",
  MIDDLE: "Middle",
  SENIOR: "Senior",
  LEAD: "Lead",
  PRINCIPAL: "Principal",
};

const FORMAT_LABELS: Record<string, string> = {
  OFFICE: "Офис",
  HYBRID: "Гибрид",
  REMOTE: "Удалённо",
};

interface Vacancy {
  id: string;
  title: string;
  companyName: string;
  specialty: string;
  grade: string;
  workFormat: string;
  salaryFromKopecks: string | null;
  salaryToKopecks: string | null;
  rewardKopecks: string;
  createdAt: Date;
}

function formatSalary(fromKop: string | null, toKop: string | null): string | null {
  const from = fromKop ? Math.round(Number(fromKop) / 100) : null;
  const to = toKop ? Math.round(Number(toKop) / 100) : null;
  if (!from && !to) return null;
  const fmt = (v: number) =>
    new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0,
    }).format(v);
  if (from && to) return `${fmt(from)} — ${fmt(to)}`;
  if (from) return `от ${fmt(from)}`;
  return `до ${fmt(to!)}`;
}

export function VacancyCard({ vacancy }: { vacancy: Vacancy }) {
  const salary = formatSalary(vacancy.salaryFromKopecks, vacancy.salaryToKopecks);
  const reward = Math.round(Number(vacancy.rewardKopecks) / 100);

  return (
    <Link
      href={`/vacancies/${vacancy.id}`}
      className="block rounded-2xl border border-gray-100 bg-white p-5 transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-gray-900">{vacancy.title}</h3>
          <p className="mt-0.5 text-sm text-gray-500">{vacancy.companyName}</p>
        </div>
        {reward > 0 && (
          <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            Бонус:{" "}
            {new Intl.NumberFormat("ru-RU", {
              style: "currency",
              currency: "RUB",
              maximumFractionDigits: 0,
            }).format(reward)}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
          {SPECIALTY_LABELS[vacancy.specialty] ?? vacancy.specialty}
        </span>
        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {GRADE_LABELS[vacancy.grade] ?? vacancy.grade}
        </span>
        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {FORMAT_LABELS[vacancy.workFormat] ?? vacancy.workFormat}
        </span>
        {salary && (
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{salary}</span>
        )}
      </div>
    </Link>
  );
}
