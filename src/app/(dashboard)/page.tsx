"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, MessageSquareText, ReceiptText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { firstName, greeting, longDateVn, vnHour } from "@/lib/home";
import { useApiData, useNow } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { ActionCenter } from "./_home/action-center";
import { AiValueCard } from "./_home/ai-value-card";
import { SetupChecklist } from "./_home/setup-checklist";
import { TodayPanel } from "./_home/today-panel";
import { OverviewDashboard } from "./overview-dashboard";

/**
 * Trang chủ của chủ doanh nghiệp, đọc từ trên xuống theo thứ tự quan trọng:
 * việc cần xử lý ngay → hôm nay (doanh thu, lịch) + kết quả trợ lý AI → các bước thiết lập còn thiếu → hoạt động của bot.
 * Nhân viên trực vào thẳng Hộp thư.
 */
export default function OverviewPage() {
  const { me } = useSession();
  const router = useRouter();
  const isStaff = me.currentTenant?.role === "staff";
  const now = useNow(60_000);
  const today = useApiData(() => call(() => api.GET("/reports/today")));

  useEffect(() => {
    if (isStaff) router.replace("/inbox");
  }, [isStaff, router]);
  if (isStaff) return null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-muted-foreground">{longDateVn(now)}</p>
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-[1.75rem]">
            {greeting(vnHour(now))}, {firstName(me.name)}
          </h1>
          <p className="text-sm text-muted-foreground">Đây là tình hình của {me.currentTenant?.name ?? "doanh nghiệp"} hôm nay.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/appointments?new=1" className={cn(buttonVariants(), "h-11 sm:h-9")}>
            <CalendarPlus aria-hidden />
            Đặt lịch hẹn
          </Link>
          <Link href="/sales?new=1" className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-9")}>
            <ReceiptText aria-hidden />
            Tạo hóa đơn
          </Link>
          <Link href="/chat-test" className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-9")}>
            <MessageSquareText aria-hidden />
            Chat thử bot
          </Link>
        </div>
      </header>

      <ActionCenter openInvoices={today.data?.openInvoices} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <TodayPanel today={today.data} now={now} />
        <AiValueCard />
      </div>

      <SetupChecklist />

      <OverviewDashboard />
    </div>
  );
}
