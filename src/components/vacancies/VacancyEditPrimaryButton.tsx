import Link from "next/link";
import { Button } from "@/components/ui/button";

export const VACANCY_EDIT_PRIMARY_LABEL = "Редактировать" as const;

export function VacancyEditPrimaryButton({
  href,
  className,
  variant = "default",
}: {
  href: string;
  className?: string;
  variant?: "default" | "outline";
}) {
  return (
    <Button asChild size="lg" variant={variant} className={className}>
      <Link href={href}>{VACANCY_EDIT_PRIMARY_LABEL}</Link>
    </Button>
  );
}
