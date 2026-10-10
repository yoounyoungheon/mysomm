"use client";

import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "./shared/api/query-client";
import { IntroPresentationProvider } from "./feature/intro/model/intro-presentation";

export default function Providers({ children }: { children: ReactNode }) {
  // QueryClient는 브라우저 생명주기 동안 한 번만 생성한다.
  // 다단계 플로우 전용 선택 store는 전역이 아니라 해당 세그먼트 layout에서 제공한다.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <IntroPresentationProvider>{children}</IntroPresentationProvider>
    </QueryClientProvider>
  );
}
