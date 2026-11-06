"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { CalendarDays, CalendarPlus, MessageSquareText, ReceiptText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { firstName, greeting, longDateVn, vnHour } from "@/lib/home";
import { fadeUp, stagger } from "@/lib/motion";
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
 * Các khối hiện lần lượt từ trên xuống (tắt khi người dùng chọn giảm chuyển động). Nhân viên trực vào thẳng Hộp thư.
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
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-7">
      <motion.header variants={fadeUp} className="flex flex-col gap-5 pt-1 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <p className="inline-flex w-fit items-center gap-1.5 rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-card backdrop-blur">
            <CalendarDays className="size-3.5 text-primary" aria-hidden />
            {longDateVn(now)}
          </p>
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-balance sm:text-[34px]">
            {greeting(vnHour(now))}, <span className="text-brand-gradient">{firstName(me.name)}</span>
          </h1>
          <p className="text-sm text-muted-foreground sm:text-[15px]">
            Đây là tình hình của <span className="font-medium text-foreground">{me.currentTenant?.name ?? "doanh nghiệp"}</span> hôm nay.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 lg:flex">
          <Link href="/appointments?new=1" className={cn(buttonVariants(), "h-11 rounded-full px-4 sm:h-10")}>
            <CalendarPlus aria-hidden />
            Đặt lịch hẹn
          </Link>
          <Link href="/sales?new=1" className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-full px-4 sm:h-10")}>
            <ReceiptText aria-hidden />
            Tạo hóa đơn
          </Link>
          <Link href="/chat-test" className={cn(buttonVariants({ variant: "outline" }), "h-11 rounded-full px-4 sm:h-10")}>
            <MessageSquareText aria-hidden />
            Chat thử bot
          </Link>
        </div>
      </motion.header>

      <motion.div variants={fadeUp}>
        <ActionCenter openInvoices={today.data?.openInvoices} />
      </motion.div>

      <motion.div variants={fadeUp} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <TodayPanel today={today.data} now={now} />
        <AiValueCard />
      </motion.div>

      {/* Thiết lập xong hết thì SetupChecklist không hiện gì: ẩn luôn khung bọc để không thừa khoảng trống. */}
      <motion.div variants={fadeUp} className="empty:hidden">
        <SetupChecklist />
      </motion.div>

      <motion.div variants={fadeUp}>
        <OverviewDashboard />
      </motion.div>
    </motion.div>
  );
}
