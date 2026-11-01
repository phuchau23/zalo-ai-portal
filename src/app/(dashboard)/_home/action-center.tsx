"use client";

import Link from "next/link";
import { ArrowRight, CircleCheckBig, HeartHandshake, Inbox, ReceiptText, type LucideIcon } from "lucide-react";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";

/**
 * "Cần xử lý ngay": 3 việc tồn có thể làm mất khách hoặc mất tiền nếu để lâu —
 * khách đang chờ nhân viên, khách cần chăm sóc, hóa đơn còn nợ. Số 0 hiện dấu xong để chủ doanh nghiệp yên tâm.
 */
export function ActionCenter({ openInvoices }: { openInvoices: number | undefined }) {
  const waiting = useApiData(() => call(() => api.GET("/inbox/conversations", { params: { query: { filter: "attention", includeTest: true } } })));
  const care = useApiData(() => call(() => api.GET("/care/count")));

  return (
    <section aria-labelledby="todo" className="flex flex-col gap-3">
      <h2 id="todo" className="text-sm font-semibold text-muted-foreground">
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
        <Tile href="/sales" icon={ReceiptText} count={openInvoices} label="Hóa đơn còn nợ hôm nay" todo="Thu nốt tiền khách" clear="Không còn hóa đơn nợ" />
      </ul>
    </section>
  );
}

function Tile({
  href,
  icon: Icon,
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
        className="group surface flex h-full items-center gap-4 p-4 transition-shadow hover:shadow-card-hover focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            pending ? "bg-warning/12 text-warning" : "bg-success/10 text-success",
            loading && "bg-muted text-muted-foreground",
          )}
          aria-hidden
        >
          {pending || loading ? <Icon className="size-5" /> : <CircleCheckBig className="size-5" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline gap-2">
            <span className={cn("tabular text-2xl leading-none font-semibold", !pending && "text-muted-foreground")}>
              {loading ? <span className="inline-block h-6 w-6 animate-pulse rounded bg-muted align-middle motion-reduce:animate-none" /> : count}
            </span>
            <span className="truncate text-sm font-medium">{label}</span>
          </span>
          <span className="text-xs text-muted-foreground">{loading ? "Đang tải..." : pending ? todo : clear}</span>
        </span>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
      </Link>
    </li>
  );
}
