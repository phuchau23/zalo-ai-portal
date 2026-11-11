"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, CircleCheck, HandCoins, Info, PackageOpen, WalletCards } from "lucide-react";
import { ChartCard } from "@/components/charts/chart-card";
import { PersonAvatar } from "@/components/common/person-avatar";
import { StatCard } from "@/components/common/stat-card";
import { ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { sortBy } from "@/lib/reports";
import { useApiQuery } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { InvoiceDetailDialog } from "../sales/invoice-detail";
import { count, money, moneyShort } from "./report-format";
import type { ReportTabProps } from "./reports-page";

type SortKey = "due" | "issuedAt" | "number" | "contactName";

/** Công nợ tại thời điểm hiện tại (không theo khoảng ngày): khách còn nợ, buổi gói chưa dùng, số dư thẻ trả trước. */
export function DebtTab({ params, now }: ReportTabProps) {
  const report = useApiQuery(() => call(() => api.GET("/reports/outstanding", { params: { query: { branchId: params.branchId ?? undefined } } })), `${params.branchId}`);
  const o = report.data;
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "due", dir: "desc" });
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = o
    ? sortBy(o.invoices, (i) => (sort.key === "contactName" ? (i.contactName ?? "") : sort.key === "issuedAt" ? new Date(i.issuedAt).getTime() : sort.key === "number" ? i.number : i.due), sort.dir)
    : [];

  function header(key: SortKey, label: string, align: "left" | "right" = "left") {
    const active = sort.key === key;
    const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <TableHead aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={cn(align === "right" && "text-right")}>
        <button
          type="button"
          onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }))}
          className={cn(
            "inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-md font-medium transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            active && "text-foreground",
          )}
        >
          {label}
          <Icon className={cn("size-3.5", !active && "opacity-50")} aria-hidden />
        </button>
      </TableHead>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4 transition-opacity", report.stale && "opacity-70")}>
      {report.problem && <ErrorState problem={report.problem} onRetry={report.reload} />}

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard emphasis icon={HandCoins} tone="warning" label="Khách còn nợ" value={o?.invoiceDue ?? 0} format={moneyShort} title={o ? money(o.invoiceDue) : undefined} hint={o ? `${count(o.invoices.length)} hóa đơn chưa thu đủ` : undefined} />
        <StatCard tint="peach" icon={PackageOpen} tone="ai" label="Buổi gói chưa dùng" value={o?.unusedSessions ?? 0} format={(n) => `${count(n)} buổi`} hint={o ? `Trị giá ${money(o.unusedPackageValue)} — khách đã trả, chưa làm` : undefined} />
        <StatCard tint="sky" icon={WalletCards} label="Số dư thẻ trả trước" value={o?.walletBalances ?? 0} format={moneyShort} title={o ? money(o.walletBalances) : undefined} hint="Tiền khách nạp, chưa tiêu" />
      </div>

      <p className="flex items-start gap-2 text-sm text-pretty text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        Buổi gói chưa dùng và số dư thẻ là tiền đã thu nhưng doanh nghiệp còn “nợ” dịch vụ cho khách. Số tính tại thời điểm mở trang.
      </p>

      <ChartCard
        icon={HandCoins}
        tone="warning"
        title="Hóa đơn chưa thu đủ"
        description="Bấm một dòng để xem hóa đơn và thu tiền"
        loading={report.loading}
        skeleton="list"
        bodyClassName="px-0 pb-0"
      >
        {o &&
          (o.invoices.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-5 pt-4 pb-8 text-center">
              <CircleCheck className="size-8 text-success" aria-hidden />
              <p className="font-medium">Không có hóa đơn nào còn nợ</p>
              <p className="text-sm text-muted-foreground">Mọi hóa đơn đã thu đủ tiền.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  {header("number", "Hóa đơn")}
                  {header("contactName", "Khách")}
                  {header("issuedAt", "Ngày lập")}
                  {header("due", "Còn nợ", "right")}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((i) => {
                  const age = Math.floor((now - new Date(i.issuedAt).getTime()) / 86_400_000);
                  return (
                    <TableRow
                      key={i.invoiceId}
                      tabIndex={0}
                      onClick={() => setOpenId(i.invoiceId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setOpenId(i.invoiceId);
                        }
                      }}
                      aria-label={`Hóa đơn số ${i.number}, ${i.contactName ?? "khách lẻ"}, còn nợ ${money(i.due)}`}
                      className="cursor-pointer focus-visible:bg-muted/60 focus-visible:outline-none"
                    >
                      <TableCell className="font-medium tabular-nums">#{i.number}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2.5">
                          <PersonAvatar name={i.contactName ?? "Khách lẻ"} size="sm" />
                          <span className="truncate">{i.contactName ?? "Khách lẻ"}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="flex flex-col gap-0.5">
                          <span className="tabular-nums">{formatDateTime(i.issuedAt)}</span>
                          {age >= 30 ? (
                            <Badge variant="outline" className="w-fit border-warning/40 text-warning">
                              Nợ {age} ngày
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">{age === 0 ? "Hôm nay" : `${age} ngày trước`}</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-warning tabular-nums">{money(i.due)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ))}
      </ChartCard>

      {openId && (
        <InvoiceDetailDialog
          invoiceId={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => {
            report.reload();
          }}
        />
      )}
    </div>
  );
}
