"use client";

import Link from "next/link";
import { ArrowRight, CircleCheckBig, HeartHandshake, Inbox, ReceiptText, type LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/common/animated-number";
import { IconTile } from "@/components/common/icon-tile";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";

/**
 * "Cần xử lý ngay": 3 việc tồn có thể làm mất khách hoặc mất tiền nếu để lâu —
 * khách đang chờ nhân viên, khách cần chăm sóc, hóa đơn còn nợ. Số 0 hiện dấu xong để chủ doanh nghiệp yên tâm.
 * Còn việc thì thẻ có viền cam, chấm nhấp nháy và số chạy.
 */
export function ActionCenter({ openInvoices }: { openInvoices: number | undefined }) {
  const waiting = useApiData(() => call(() => api.GET("/inbox/conversations", { params: { query: { filter: "attention", includeTest: true } } })));
  const care = useApiData(() => call(() => api.GET("/care/count")));

  return (
    <section aria-labelledby="todo" className="flex flex-col gap-3">
      <h2 id="todo" className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        Cần xử lý ngay
      </h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        <Tile
          href="/inbox"
          icon={Inbox}
          count={waiting.data?.length}
          label="Khách đang chờ nhân viên"
          todo="Mở Hộp thư để trả lời"
          clear="Không có khách nào chờ"
        />
        <Tile href="/care" icon={HeartHandshake} count={care.data?.open} label="Khách cần chăm sóc" todo="Xem gợi ý và tin nháp" clear="Đã chăm sóc hết" />
        <Tile href="/sales" icon={ReceiptText} count={openInvoices} label="Hóa đơn chưa thu đủ" todo="Thu nốt tiền khách" clear="Không còn hóa đơn nợ" />
      </ul>
    </section>
  );
}

function Tile({
  href,
  icon,
  count,
  label,
  todo,
  clear,
}: {
  href: string;
  icon: LucideIcon;
  count: number | undefined;
  label: string;
  todo: string;
  clear: string;
}) {
  const loading = count === undefined;
  const pending = !loading && count > 0;
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "group lift relative flex h-full items-center gap-4 overflow-hidden rounded-xl border bg-card p-4 shadow-card focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          pending && "border-warning/30",
        )}
      >
        <span className="relative">
          {loading ? (
            <span className="skeleton block size-11 rounded-xl" />
          ) : (
            <IconTile icon={pending ? icon : CircleCheckBig} tone={pending ? "warning" : "success"} size="md" className="size-11" />
          )}
        </span>
        <span className="relative flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-baseline gap-2">
            <span className={cn("font-display text-[28px] leading-none font-semibold", !pending && "text-muted-foreground")}>
              {loading ? <span className="skeleton inline-block h-7 w-8 align-middle" /> : <AnimatedNumber value={count} />}
            </span>
            <span className="truncate text-sm font-medium">{label}</span>
          </span>
          <span className={cn("text-xs", pending ? "font-medium text-warning" : "text-muted-foreground")}>{loading ? "Đang tải..." : pending ? todo : clear}</span>
        </span>
        <ArrowRight className="relative size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground motion-reduce:transition-none" aria-hidden />
      </Link>
    </li>
  );
}
