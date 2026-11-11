"use client";

import { useEffect, useState } from "react";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import type { NavBadge } from "./nav-config";

/**
 * Số trên huy hiệu menu: khách đang chờ nhân viên (Hộp thư) và gợi ý "Cần chăm sóc" đang mở.
 * Tải lại mỗi phút; đổi doanh nghiệp thì tải lại ngay. Lỗi mạng thì giữ số cũ (không làm phiền người dùng).
 */
export function useNavCounts(tenantId: string | undefined): Record<NavBadge, number> {
  const [counts, setCounts] = useState<Record<NavBadge, number>>({ inbox: 0, care: 0 });

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    const load = async () => {
      const [care, waiting] = await Promise.all([
        call(() => api.GET("/care/count")),
        call(() => api.GET("/inbox/conversations", { params: { query: { filter: "attention", includeTest: true } } })),
      ]);
      if (cancelled) return;
      setCounts((prev) => ({
        care: care.ok ? care.data.open : prev.care,
        inbox: waiting.ok ? waiting.data.length : prev.inbox,
      }));
    };
    void load();
    const timer = setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tenantId]);

  return counts;
}
