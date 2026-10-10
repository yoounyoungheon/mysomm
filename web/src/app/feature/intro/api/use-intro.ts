"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

export function useIntroStatus() {
  return useQuery({
    queryKey: ["intro", "status"],
    queryFn: async ({ signal }): Promise<{ isFirstVisit: boolean }> => {
      const timeout = new AbortController();
      const timer = setTimeout(() => timeout.abort(), 3000);
      const abort = () => timeout.abort();
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
      try {
        const response = await fetch("/api/intro/status", {
          credentials: "same-origin", cache: "no-store", signal: timeout.signal,
        });
        if (!response.ok) throw new Error("Intro status unavailable");
        const data: unknown = await response.json();
        if (!data || typeof data !== "object" || !("isFirstVisit" in data) ||
            typeof data.isFirstVisit !== "boolean") throw new Error("Invalid intro status");
        return { isFirstVisit: data.isFirstVisit };
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
      }
    },
    staleTime: 0,
    gcTime: 0,
    retry: false,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
}

export function useCompleteIntro() {
  return useMutation({
    mutationFn: async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      try {
        const response = await fetch("/api/intro/complete", {
          method: "POST", credentials: "same-origin", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Intro completion unavailable");
      } finally {
        clearTimeout(timer);
      }
    },
    retry: false,
  });
}
