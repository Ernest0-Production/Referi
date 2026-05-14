"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ApplicantsPageRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/vacancy#candidates");
  }, [router]);
  return null;
}
