"use client";

import Link from "next/link";
import { ArrowRight, Bot, CalendarCheck2, Coins, Sparkles } from "lucide-react";
import { AnimatedNumber } from "@/components/common/animated-number";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { addDays, defaultTimeZone, todayKey } from "@/lib/appointments";
import { formatMoney } from "@/lib/format";
import { percent } from "@/lib/home";
import { useApiData } from "@/lib/use-api-data";
import { formatUsd, formatVnd } from "../chat-test/labels";

const usdToVnd = 26_000;

/**
 * Thẻ "giá trị của trợ lý AI" 30 ngày qua: doanh thu từ khách do bot chốt lịch, lịch bot tự chốt, tỷ lệ hội thoại bot tự xử lý,
 * chi phí AI. Đây là con số chủ doanh nghiệp cần thấy để biết bot đáng tiền (BE: GET /reports/ai, quyền xem báo cáo).
 */
export function AiValueCard() {
  const today = todayKey(defaultTimeZone);
  const from = addDays(today, -29);
  const { data, problem } = useApiData(() => call(() => api.GET("/reports/ai", { params: { query: { from, to: today } } })));

  // Không có quyền xem báo cáo (403) hoặc lỗi: không chiếm chỗ trang chủ.
  if (problem && !data) return null;

  const handledRate = data ? percent(data.conversationsHandledByBot, data.conversationsTotal) : null;
  const roi = data && data.aiCostUsd > 0 && data.revenueFromBot > 0 ? Math.round(data.revenueFromBot / (data.aiCostUsd * usdToVnd)) : null;
  const empty = data && data.conversationsTotal === 0 && data.botBookedAppointments === 0;

  return (
    <section
      aria-labelledby="ai-value"
      className="relative isolate flex flex-col gap-5 overflow-hidden rounded-2xl bg-brand-gradient p-5 text-white shadow-glow-ai sm:p-6"
    >
      {/* Vòng sáng + lưới chấm trang trí, không mang thông tin. */}
      <div className="pointer-events-none absolute -top-16 -right-16 -z-10 size-52 rounded-full bg-white/15 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -left-10 -z-10 size-52 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(rgb(255_255_255/0.35)_1px,transparent_1px)] [background-size:18px_18px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]"
        aria-hidden
      />

      <div className="relative flex items-center justify-between gap-3">
        <h2 id="ai-value" className="flex items-center gap-2.5 text-sm font-semibold text-white/90">
          <span className="flex size-8 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 ring-inset">
            <Sparkles className="size-4" aria-hidden />
          </span>
          Trợ lý AI · 30 ngày qua
        </h2>
        {data && !empty && (
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white/90 ring-1 ring-white/20 ring-inset">
            <span className="relative flex size-1.5" aria-hidden>
              <span className="absolute inset-0 animate-ping-soft rounded-full bg-white motion-reduce:hidden" />
              <span className="relative size-1.5 rounded-full bg-white" />
            </span>
            Đang trả lời khách
          </span>
        )}
      </div>

      {!data ? (
        <div role="status" aria-label="Đang tải kết quả của trợ lý AI" className="relative flex flex-col gap-3">
          <div className="h-9 w-2/3 animate-pulse rounded-lg bg-white/20 motion-reduce:animate-none" />
          <div className="h-24 animate-pulse rounded-xl bg-white/10 motion-reduce:animate-none" />
        </div>
      ) : empty ? (
        <div className="relative flex flex-col gap-3">
          <p className="text-lg leading-snug font-semibold">Bot chưa có khách thật nào trong 30 ngày qua.</p>
          <p className="text-sm text-white/85">
            Kết nối Zalo OA để bot trả lời khách 24/7, tự chốt lịch và mang khách về cho bạn. Số liệu sẽ hiện ở đây.
          </p>
          <Link
            href="/channels"
            className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-primary shadow-sm transition-transform hover:translate-x-0.5 focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none sm:min-h-9"
          >
            Kết nối Zalo OA
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      ) : (
        <>
          <div className="relative flex flex-col gap-1">
            <p className="text-sm text-white/80">Doanh thu từ khách do bot chốt lịch</p>
            <p className="text-3xl font-bold tracking-tight sm:text-[2.25rem]">
              <AnimatedNumber value={data.revenueFromBot} format={formatMoney} />
            </p>
            {roi !== null && (
              <p className="text-sm text-white/85">
                Mỗi 1 đồng chi phí AI mang về khoảng <strong className="font-semibold text-white">{roi.toLocaleString("vi-VN")} đồng</strong>.
              </p>
            )}
          </div>

          <dl className="relative grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <Stat icon={CalendarCheck2} label="Lịch bot tự chốt" value={data.botBookedAppointments.toLocaleString("vi-VN")} hint={`${data.botBookedDone} lịch khách đã đến làm`} />
            <Stat
              icon={Bot}
              label="Bot tự xử lý"
              value={handledRate === null ? "—" : `${handledRate}%`}
              hint={`${data.conversationsHandledByBot}/${data.conversationsTotal} hội thoại không cần người`}
            />
            <Stat icon={Coins} label="Chi phí AI" value={formatUsd(data.aiCostUsd)} hint={`≈ ${formatVnd(data.aiCostUsd, usdToVnd)}`} />
          </dl>

          <a
            href="#bot-activity"
            className="relative inline-flex w-fit items-center gap-1.5 rounded-md text-sm font-medium text-white/90 underline-offset-4 hover:text-white hover:underline focus-visible:ring-3 focus-visible:ring-white/60 focus-visible:outline-none"
          >
            Xem hoạt động của bot
            <ArrowRight className="size-4" aria-hidden />
          </a>
        </>
      )}
    </section>
  );
}

function Stat({ icon: Icon, label, value, hint }: { icon: typeof Bot; label: string; value: string; hint: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-white/12 p-3 ring-1 ring-white/15 backdrop-blur-sm transition-colors ring-inset hover:bg-white/[0.18]">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-white/80">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="tabular text-xl font-semibold">{value}</dd>
      <dd className="text-xs leading-snug text-white/75">{hint}</dd>
    </div>
  );
}
