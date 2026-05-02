import Link from "next/link";
import { cn } from "@/lib/utils";

export function ServiceBrandLink({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("font-bold text-gray-900 hover:text-blue-600", className)}>
      Referi
    </Link>
  );
}
