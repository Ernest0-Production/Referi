"use client";

import { useSyncExternalStore } from "react";

const MD_UP_QUERY = "(min-width: 768px)";

function subscribe(onStoreChange: () => void) {
  const mq = window.matchMedia(MD_UP_QUERY);
  mq.addEventListener("change", onStoreChange);
  return () => mq.removeEventListener("change", onStoreChange);
}

function getSnapshot() {
  return window.matchMedia(MD_UP_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useMdUp(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
