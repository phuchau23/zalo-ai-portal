"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Gauge } from "lucide-react";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { expiryState, formatVnDate } from "@/lib/admin";
import { cn } from "@/lib/utils";

/** Nhắc chủ DN gia hạn: từ 7 ngày trước hạn; quá hạn 3 ngày thì hệ thống tự khóa (BE: Billing). */
export function ExpiryBanner({ expiresAt }: { expiresAt: string | null }) {
  const state = expiryState(expiresAt);
  if (state.kind === "none") return null;
  const date = formatVnDate(expiresAt);
  return (
    <Banner tone="warning" icon={CalendarClock}>
      {state.kind === "soon"
        ? `Gói thuê hết hạn ${state.daysLeft === 0 ? "hôm nay" : `sau ${state.daysLeft} ngày`} (${date}). Liên hệ để gia hạn, tránh bot ngừng trả lời khách.`
        : `Gói thuê đã hết hạn ngày ${date}. Quá hạn 3 ngày hệ thống sẽ tự tạm khóa, bot ngừng trả lời khách. Liên hệ để gia hạn.`}
    </Banner>
  );
}

/** Cảnh báo hạn mức hội thoại tháng (từ 80%; hết → khách mới chuyển nhân viên). Tải lại mỗi 10 phút. */
export function UsageBanner({ tenantId }: { tenantId: string }) {
  const [usage, setUsage] = useState<{ used: number; quota: number | null; warning: boolean; exceeded: boolean } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const result = await call(() => api.GET("/tenant/usage"));
      if (!cancelled && result.ok) setUsage(result.data);
    };
    void load();
    const timer = setInterval(() => void load(), 600_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tenantId]);
  if (!usage || !usage.warning || usage.quota === null) return null;
  return (
    <Banner tone={usage.exceeded ? "destructive" : "warning"} icon={Gauge}>
      {usage.exceeded
        ? `Đã dùng hết ${usage.quota} hội thoại của tháng này. Khách mới nhắn sẽ được chuyển sang nhân viên trong Hộp thư (bot vẫn trả lời khách đã nhắn trong tháng). Liên hệ để nâng gói.`
        : `Đã dùng ${usage.used}/${usage.quota} hội thoại của tháng này. Khi hết, khách mới sẽ được chuyển sang nhân viên thay vì bot trả lời.`}
    </Banner>
  );
}

function Banner({ tone, icon: Icon, children }: { tone: "warning" | "destructive"; icon: typeof Gauge; children: string }) {
  return (
    <div
      role="status"
      className={cn(
        "mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
        tone === "destructive" ? "border-destructive/25 bg-destructive/5 text-destructive" : "border-warning/25 bg-warning/10 text-warning",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
