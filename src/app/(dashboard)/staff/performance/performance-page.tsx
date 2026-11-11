"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarCheck2, Clock4, Crown, HandCoins, Repeat, Store, Trophy, UserRoundX, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { PeriodPicker } from "@/components/common/period-picker";
import { PersonAvatar } from "@/components/common/person-avatar";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type Schemas } from "@/lib/api/client";
import { branchName, hasPermission } from "@/lib/crm";
import { fadeUp, stagger } from "@/lib/motion";
import { hoursLabel, presetRange, rangeFromQuery, rangeLabel, shiftDays, sortBy, type DateRange } from "@/lib/reports";
import { useApiData, useApiQuery } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { count, money, moneyShort, percentText, ratio } from "../../reports/report-format";
import { StaffTabs } from "../staff-tabs";

type Row = Schemas["StaffPerformanceResponse"];
type SortKey = "staffName" | "revenue" | "appointmentsDone" | "noShows" | "customers" | "returning" | "hoursWorked" | "perHour" | "commission";

const ALL = "__all__";

/** Doanh thu mỗi giờ làm (0 khi chưa chấm công giờ nào). */
const perHour = (r: Row) => (r.hoursWorked > 0 ? Math.round(r.revenue / r.hoursWorked) : 0);
const returningRate = (r: Row) => ratio(r.returningCustomers, r.customers) ?? 0;

/**
 * Hiệu suất nhân viên (C5): ai mang về doanh thu, làm bao nhiêu buổi, giữ chân khách thế nào, giờ làm và hoa hồng.
 * Quản lý (xem doanh thu công ty hoặc quản lý nhân viên) thấy cả đội: ba thẻ dẫn đầu + bảng xếp hạng sắp xếp được.
 * Nhân viên thường chỉ thấy số của chính mình (tài khoản phải gắn hồ sơ nhân viên).
 */
export function PerformancePage() {
  const { me } = useSession();
  const tenant = me.currentTenant;
  const seesTeam = hasPermission(tenant, "view_company_revenue") || hasPermission(tenant, "manage_staff");
  const search = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const range = rangeFromQuery(search.get("from"), search.get("to"), presetRange("30d", now));
  const branchId = search.get("branch");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "revenue", dir: "desc" });

  const branches = useApiData(() => call(() => api.GET("/branches", { params: { query: { includeInactive: false } } })));
  // BE nhận thời điểm (ISO); "đến ngày" tính hết ngày đó theo giờ VN → +1 ngày lúc 00:00 (+07:00).
  const report = useApiQuery(
    () =>
      call(() =>
        api.GET("/staff/performance", {
          params: { query: { from: `${range.from}T00:00:00+07:00`, to: `${shiftDays(range.to, 1)}T00:00:00+07:00`, branchId: branchId ?? undefined } },
        }),
      ),
    `${range.from}|${range.to}|${branchId}`,
  );

  function go(next: { range?: DateRange; branch?: string | null }) {
    const r = next.range ?? range;
    const b = next.branch === undefined ? branchId : next.branch;
    const q = new URLSearchParams({ from: r.from, to: r.to, ...(b ? { branch: b } : {}) });
    router.replace(`${pathname}?${q}`, { scroll: false });
  }

  const rows = useMemo(() => {
    const data = report.data ?? [];
    const key = (r: Row): number | string =>
      sort.key === "staffName" ? r.staffName
      : sort.key === "returning" ? returningRate(r)
      : sort.key === "perHour" ? perHour(r)
      : r[sort.key];
    return sortBy(data, key, sort.dir);
  }, [report.data, sort]);

  const data = report.data ?? [];
  const totals = data.reduce(
    (t, r) => ({ revenue: t.revenue + r.revenue, done: t.done + r.appointmentsDone, hours: t.hours + r.hoursWorked, commission: t.commission + r.commission, noShows: t.noShows + r.noShows }),
    { revenue: 0, done: 0, hours: 0, commission: 0, noShows: 0 },
  );
  const leader = (pick: (r: Row) => number) => (data.length ? [...data].sort((a, b) => pick(b) - pick(a))[0] : null);
  const topRevenue = leader((r) => r.revenue);
  const topSessions = leader((r) => r.appointmentsDone);
  const topLoyal = leader((r) => (r.customers >= 3 ? returningRate(r) : -1));

  const forbidden = report.problem?.status === 403;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Trophy}
        title="Hiệu suất nhân viên"
        description={seesTeam ? "Ai mang về doanh thu, làm nhiều buổi, giữ chân khách tốt — để khen thưởng và xếp ca hợp lý." : "Số liệu làm việc của bạn trong khoảng đã chọn."}
        help={
          <ul>
            <li>
              <strong>Doanh thu</strong> tính từ dòng hóa đơn có gắn nhân viên; <strong>buổi làm</strong> là lịch hẹn đã hoàn thành.
            </li>
            <li>
              <strong>Khách quay lại</strong>: khách của nhân viên đó đã từng đến trước khoảng này. <strong>Giờ làm</strong> lấy từ chấm công.
            </li>
            <li>Bấm tiêu đề cột để sắp xếp. Nhân viên chỉ thấy số của chính mình.</li>
          </ul>
        }
        actions={
          <>
            {seesTeam && (branches.data?.length ?? 0) > 1 && (
              <Select value={branchId ?? ALL} onValueChange={(v) => go({ branch: v === ALL ? null : v })}>
                <SelectTrigger className="h-11 w-full min-w-44 rounded-xl bg-card shadow-card sm:h-10 sm:w-auto" aria-label="Chi nhánh">
                  <Store className="text-primary" aria-hidden />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Mọi chi nhánh</SelectItem>
                  {branches.data!.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <PeriodPicker value={range} onChange={(r) => go({ range: r })} now={now} className="w-full sm:w-auto" />
          </>
        }
      />
      <StaffTabs />

      {forbidden ? (
        <EmptyState
          icon={Users}
          title="Tài khoản chưa gắn hồ sơ nhân viên"
          description="Nhờ chủ doanh nghiệp gắn tài khoản của bạn vào hồ sơ nhân viên (Nhân viên → mở hồ sơ → Tài khoản đăng nhập) để xem số của mình."
        />
      ) : report.problem ? (
        <ErrorState problem={report.problem} onRetry={report.reload} />
      ) : report.loading ? (
        <LoadingRows rows={5} columns={6} label="Đang tải hiệu suất" />
      ) : data.length === 0 ? (
        <EmptyState icon={Trophy} title="Chưa có nhân viên nào" description="Thêm nhân viên ở mục Hồ sơ & ca làm, gắn họ vào lịch hẹn và hóa đơn để thấy hiệu suất." />
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className={cn("flex flex-col gap-5 transition-opacity", report.stale && "opacity-70")}>
          {seesTeam && data.length > 1 && (
            <motion.div variants={fadeUp} className="grid gap-3 md:grid-cols-3">
              {topRevenue && topRevenue.revenue > 0 && <Spotlight tone="success" icon={Wallet} title="Doanh thu cao nhất" row={topRevenue} value={money(topRevenue.revenue)} />}
              {topSessions && topSessions.appointmentsDone > 0 && <Spotlight tone="primary" icon={CalendarCheck2} title="Làm nhiều buổi nhất" row={topSessions} value={`${count(topSessions.appointmentsDone)} buổi`} />}
              {topLoyal && topLoyal.customers >= 3 && <Spotlight tone="ai" icon={Repeat} title="Giữ chân khách tốt nhất" row={topLoyal} value={`${percentText(returningRate(topLoyal))} khách quay lại`} />}
            </motion.div>
          )}

          <motion.div variants={fadeUp} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard emphasis icon={Wallet} tone="success" label={seesTeam ? "Doanh thu cả đội" : "Doanh thu của bạn"} value={totals.revenue} format={moneyShort} title={money(totals.revenue)} hint={rangeLabel(range)} />
            <StatCard tint="sky" icon={CalendarCheck2} label="Buổi đã làm" value={totals.done} format={count} hint={totals.noShows ? `${count(totals.noShows)} lịch khách không đến` : "Không có lịch khách bỏ"} />
            <StatCard tint="peach" icon={Clock4} tone="ai" label="Giờ làm" value={Math.round(totals.hours)} format={(n) => `${count(n)} giờ`} hint={totals.hours > 0 ? `${moneyShort(Math.round(totals.revenue / totals.hours))} mỗi giờ làm` : "Theo chấm công"} />
            <StatCard tint="butter" icon={HandCoins} tone="warning" label="Hoa hồng" value={totals.commission} format={moneyShort} title={money(totals.commission)} hint="Phát sinh trong khoảng" />
          </motion.div>

          {seesTeam && (
            <motion.section variants={fadeUp} aria-label="Bảng xếp hạng nhân viên" className="surface overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
                <div>
                  <h2 className="text-[15px] font-semibold tracking-tight">Bảng xếp hạng</h2>
                  <p className="text-[13px] text-muted-foreground">{rangeLabel(range)} · bấm tiêu đề cột để sắp xếp</p>
                </div>
              </div>

              {/* Màn hẹp: thẻ từng người (bảng 9 cột không vừa 375px). */}
              <ol className="flex flex-col divide-y md:hidden">
                {rows.map((r, i) => (
                  <li key={r.staffMemberId} className="flex flex-col gap-3 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <Rank index={i} />
                      <PersonAvatar name={r.staffName} size="md" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium">{r.staffName}</span>
                        <span className="text-xs text-muted-foreground">{branchName(branches.data, r.branchId)}</span>
                      </div>
                      <span className="text-right font-semibold tabular-nums">{moneyShort(r.revenue)}</span>
                    </div>
                    <dl className="grid grid-cols-3 gap-2 text-center">
                      <MiniStat label="Buổi" value={count(r.appointmentsDone)} />
                      <MiniStat label="Quay lại" value={r.customers ? percentText(returningRate(r)) : "—"} />
                      <MiniStat label="Giờ làm" value={hoursLabel(r.hoursWorked)} />
                    </dl>
                  </li>
                ))}
              </ol>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <SortHead label="Nhân viên" k="staffName" sort={sort} onSort={setSort} />
                      <SortHead label="Doanh thu" k="revenue" sort={sort} onSort={setSort} right />
                      <SortHead label="Buổi làm" k="appointmentsDone" sort={sort} onSort={setSort} right />
                      <SortHead label="Không đến" k="noShows" sort={sort} onSort={setSort} right />
                      <SortHead label="Khách" k="customers" sort={sort} onSort={setSort} right />
                      <SortHead label="Quay lại" k="returning" sort={sort} onSort={setSort} right />
                      <SortHead label="Giờ làm" k="hoursWorked" sort={sort} onSort={setSort} right />
                      <SortHead label="DT / giờ" k="perHour" sort={sort} onSort={setSort} right />
                      <SortHead label="Hoa hồng" k="commission" sort={sort} onSort={setSort} right />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => {
                      const maxRevenue = Math.max(1, ...data.map((d) => d.revenue));
                      return (
                        <TableRow key={r.staffMemberId}>
                          <TableCell>
                            <span className="flex items-center gap-3">
                              <Rank index={i} />
                              <PersonAvatar name={r.staffName} size="sm" />
                              <span className="flex min-w-0 flex-col">
                                <span className="truncate font-medium">{r.staffName}</span>
                                <span className="text-xs text-muted-foreground">{branchName(branches.data, r.branchId)}</span>
                              </span>
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="flex flex-col items-end gap-1">
                              <span className="font-semibold tabular-nums" title={money(r.revenue)}>
                                {moneyShort(r.revenue)}
                              </span>
                              <span className="h-1.5 w-20 overflow-hidden rounded-full bg-muted" aria-hidden>
                                <span className="block h-full rounded-full bg-success" style={{ width: `${(r.revenue / maxRevenue) * 100}%` }} />
                              </span>
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{count(r.appointmentsDone)}</TableCell>
                          <TableCell className={cn("text-right tabular-nums", r.noShows > 0 ? "font-medium text-warning" : "text-muted-foreground")}>{count(r.noShows)}</TableCell>
                          <TableCell className="text-right tabular-nums">{count(r.customers)}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.customers ? percentText(returningRate(r)) : "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{hoursLabel(r.hoursWorked)}</TableCell>
                          <TableCell className="text-right text-muted-foreground tabular-nums">{r.hoursWorked > 0 ? moneyShort(perHour(r)) : "—"}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{moneyShort(r.commission)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </motion.section>
          )}

          {!seesTeam && data[0] && (
            <motion.div variants={fadeUp} className="grid gap-3 sm:grid-cols-3">
              <StatCard icon={Users} label="Khách đã phục vụ" value={data[0].customers} format={count} hint={`${count(data[0].returningCustomers)} khách quay lại`} />
              <StatCard icon={Repeat} tone="success" label="Tỷ lệ khách quay lại" value={returningRate(data[0])} format={percentText} hint="Khách đã từng đến trước đó" />
              <StatCard icon={UserRoundX} tone={data[0].noShows ? "warning" : "muted"} label="Khách không đến" value={data[0].noShows} format={count} hint="Lịch hẹn khách bỏ" />
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}

function Rank({ index }: { index: number }) {
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
        index === 0 ? "bg-foreground text-background"
        : index === 1 ? "bg-foreground/70 text-background"
        : index === 2 ? "bg-foreground/45 text-background"
        : "bg-muted text-muted-foreground",
      )}
      aria-label={`Hạng ${index + 1}`}
    >
      {index + 1}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-1.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

const spotlightTone = {
  success: "text-success",
  primary: "text-primary",
  ai: "text-ai",
} as const;

/** Thẻ "dẫn đầu" một hạng mục: biểu tượng vương miện, ảnh chữ cái, tên, con số. */
function Spotlight({ tone, icon: Icon, title, row, value }: { tone: keyof typeof spotlightTone; icon: typeof Crown; title: string; row: Row; value: string }) {
  return (
    <div className={cn("relative flex items-center gap-4 overflow-hidden rounded-xl border bg-card p-4 shadow-card", spotlightTone[tone])}>
      <div className="relative">
        <PersonAvatar name={row.staffName} size="lg" />
        <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-card shadow-card ring-1 ring-border" aria-hidden>
          <Crown className="size-3.5 text-[oklch(0.72_0.16_70)]" />
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <Icon className="size-3.5" aria-hidden />
          {title}
        </span>
        <span className="truncate text-base font-semibold text-foreground">{row.staffName}</span>
        <span className="text-sm text-muted-foreground tabular-nums">{value}</span>
      </div>
    </div>
  );
}

function SortHead({
  label,
  k,
  sort,
  onSort,
  right,
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (s: { key: SortKey; dir: "asc" | "desc" }) => void;
  right?: boolean;
}) {
  const active = sort.key === k;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"} className={cn(right && "text-right")}>
      <button
        type="button"
        onClick={() => onSort({ key: k, dir: active && sort.dir === "desc" ? "asc" : k === "staffName" && !active ? "asc" : "desc" })}
        className={cn(
          "inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-md font-medium whitespace-nowrap transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          active && "text-foreground",
        )}
      >
        {label}
        <Icon className={cn("size-3.5", !active && "opacity-50")} aria-hidden />
      </button>
    </TableHead>
  );
}
