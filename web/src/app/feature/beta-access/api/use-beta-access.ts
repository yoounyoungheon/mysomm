"use client";

import { useMutation } from "@tanstack/react-query";

export class BetaAccessError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "BetaAccessError";
  }
}

async function postBeta(path: string, code?: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
      ...(code === undefined ? {} : {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      }),
    });
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const message = body && typeof body === "object" && "message" in body &&
        typeof body.message === "string" ? body.message : "인증을 확인하지 못했습니다. 다시 시도해 주세요.";
      throw new BetaAccessError(response.status, message);
    }
    if (!body || typeof body !== "object" || !("ok" in body) || body.ok !== true) {
      throw new Error("Invalid authentication response");
    }
  } finally {
    clearTimeout(timeout);
  }
}

export function useBetaAuthentication() {
  return useMutation({
    mutationFn: (code: string) => postBeta("/api/beta-auth", code),
    gcTime: 0,
    retry: false,
  });
}

export function useBetaEntry() {
  return useMutation({
    mutationFn: () => postBeta("/api/beta-auth/enter"),
    gcTime: 0,
    retry: false,
  });
}
