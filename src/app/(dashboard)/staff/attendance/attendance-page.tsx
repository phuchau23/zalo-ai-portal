"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { CalendarClock, Clock4, Pencil, UserRoundCheck, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { PeriodPicker } from "@/components/common/period-picker";
import { PersonAvatar } from "@/components/common/person-avatar";
import { StatCard } from "@/components/common/stat-card";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type Schemas } from "@/lib/api/client";
import { defaultTimeZone, formatDayLong, formatTime, toLocalInput } from "@/lib/appointments";
import { branchName, hasPermission } from "@/lib/crm";
import { fadeUp, stagger } from "@/lib/motion";
import { durationLabel, minutesBetween, presetRange, rangeFromQuery, rangeLabel, shiftDays, type DateRange } from "@/lib/reports";
import { useApiData, useApiQuery, useNow } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { count } from "../../reports/report-format";
import { StaffTabs } from "../staff-tabs";
import { ClockCard } from "./clock-card";
import { EditAttendanceDialog } from "./edit-dialog";

type Attendance = Schemas["AttendanceResponse"];
const ALL = "__all__";

const sourceLabel: Record<string, { label: string; className: string }> = {
  self: { label: "Tự chấm", className: "border-border text-muted-foreground" },
  manager: {
    label: "Quản lý chấm/sửa",
    className: "border-warning/40 text-warning",
  },
};

/**
 * Chấm công (C5): nhân viên bấm Vào ca / Ra ca (thẻ lớn, đồng hồ chạy), quản lý xem ai đang trong ca, nhật ký theo ngày,
 * tổng giờ từng người và sửa giờ khi quên chấm. Nhân viên thường chỉ thấy bản ghi của chính mình.
 */
export function AttendancePage() {
  const { me } = useSession();
  const tenant = me.currentTenant;
  const isManager = hasPermission(tenant, "manage_staff");
  const seesTeam = isManager || hasPermission(tenant, "view_company_revenue");
  const search = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [now0] = useState(() => Date.now());
  const now = useNow(60_000);
  const range = rangeFromQuery(search.get("from"), search.get("to"), presetRange("7d", now0));
  const staffFilter = search.get("staff");
  const [editing, setEditing] = useState<Attendance | null>(null);

  const staff = useApiData(() => call(() => api.GET("/staff", { params: { query: { includeInactive: true } } })));
  const branches = useApiData(() => call(() => api.GET("/branches", { params: { query: { includeInactive: false } } })));
  const myOpen = useApiData(() => call(() => api.GET("/attendance/me")));
  const records = useApiQuery(
    () =>
      call(() =>
        api.GET("/attendance", {
          params: {
            query: {
              from: `${range.from}T00:00:00+07:00`,
              to: `${shiftDays(range.to, 1)}T00:00:00+07:00`,
              staffMemberId: staffFilter ?? undefined,
            },
          },
        }),
      ),
    `${range.from}|${range.to}|${staffFilter}`,
  );

  const mine = staff.data?.find((s) => s.userId === me.userId) ?? null;
  const nameOf = (id: string) => staff.data?.find((s) => s.id === id)?.displayName ?? "Nhân viên";
  const list = useMemo(() => [...(records.data ?? [])].sort((a, b) => b.clockInAt.localeCompare(a.clockInAt)), [records.data]);
  const onShift = list.filter((r) => !r.clockOutAt);
  const totalMinutes = list.reduce((s, r) => s + minutesBetween(r.clockInAt, r.clockOutAt, now), 0);

  const perStaff = useMemo(() => {
    const map = new Map<string, { id: string; minutes: number; shifts: number }>();
    for (const r of list) {
      const cur = map.get(r.staffMemberId) ?? {
        id: r.staffMemberId,
        minutes: 0,
        shifts: 0,
      };
      cur.minutes += minutesBetween(r.clockInAt, r.clockOutAt, now);
      cur.shifts += 1;
      map.set(r.staffMemberId, cur);
    }
    return [...map.values()].sort((a, b) => b.minutes - a.minutes);
  }, [list, now]);

  const byDay = useMemo(() => {
    const groups = new Map<string, Attendance[]>();
    for (const r of list) {
      const day = toLocalInput(r.clockInAt, defaultTimeZone).slice(0, 10);
      groups.set(day, [...(groups.get(day) ?? []), r]);
    }
    return [...groups.entries()];
  }, [list]);

  function go(next: { range?: DateRange; staff?: string | null }) {
    const r = next.range ?? range;
    const s = next.staff === undefined ? staffFilter : next.staff;
    router.replace(`${pathname}?${new URLSearchParams({ from: r.from, to: r.to, ...(s ? { staff: s } : {}) })}`, { scroll: false });
  }

  function refresh() {
    myOpen.reload();
    records.reload();
  }

  const forbidden = records.problem?.status === 403;
  const maxMinutes = Math.max(1, ...perStaff.map((p) => p.minutes));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Clock4}
        title="Chấm công"
        description="Nhân viên bấm Vào ca khi bắt đầu, Ra ca khi về. Giờ làm dùng để tính hiệu suất."
        help={
          <ul>
            <li>
              Tài khoản đăng nhập phải được <strong>gắn với hồ sơ nhân viên</strong> (Nhân viên → mở hồ sơ → Tài khoản đăng nhập) thì mới có nút Vào ca.
            </li>
            <li>Quên chấm? Quản lý bấm biểu tượng bút ở dòng đó để sửa giờ — bản ghi được đánh dấu “Quản lý chấm/sửa”.</li>
            <li>Nhân viên chỉ thấy giờ của chính mình.</li>
          </ul>
        }
        actions={
          <>
            {seesTeam && (staff.data?.length ?? 0) > 1 && (
              <Select value={staffFilter ?? ALL} onValueChange={(v) => go({ staff: v === ALL ? null : v })}>
                <SelectTrigger className="h-11 w-full min-w-44 rounded-xl bg-card shadow-card sm:h-10 sm:w-auto" aria-label="Lọc theo nhân viên">
                  <UsersRound className="text-primary" aria-hidden />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Mọi nhân viên</SelectItem>
                  {staff.data!.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <PeriodPicker value={range} onChange={(r) => go({ range: r })} now={now0} className="w-full sm:w-auto" />
          </>
        }
      />
      <StaffTabs />

      {mine && <ClockCard me={mine} open={myOpen.data ?? null} branchName={branchName(branches.data, mine.branchId)} onChanged={refresh} />}
      {staff.data && !mine && !seesTeam && (
        <EmptyState
          icon={UsersRound}
          title="Tài khoản chưa gắn hồ sơ nhân viên"
          description="Nhờ chủ doanh nghiệp gắn tài khoản của bạn vào hồ sơ nhân viên để chấm công."
        />
      )}

      {seesTeam && onShift.length > 0 && (
        <section
          aria-labelledby="on-shift"
          className="flex flex-col gap-3 rounded-2xl border border-success/20 bg-card p-4 shadow-card sm:flex-row sm:items-center sm:gap-4"
        >
          <h2 id="on-shift" className="flex shrink-0 items-center gap-2 text-sm font-semibold">
            <span className="relative flex size-2.5" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping-soft rounded-full bg-success motion-reduce:animate-none" />
              <span className="relative inline-flex size-2.5 rounded-full bg-success" />
            </span>
            Đang trong ca · {onShift.length}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {onShift.map((r) => (
              <li key={r.id} className="flex items-center gap-2 rounded-full border bg-background py-1 pr-3 pl-1">
                <PersonAvatar name={nameOf(r.staffMemberId)} size="xs" />
                <span className="text-sm font-medium">{nameOf(r.staffMemberId)}</span>
                <span className="text-xs text-muted-foreground tabular-nums">từ {formatTime(r.clockInAt, defaultTimeZone)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {forbidden ? null : records.problem ? (
        <ErrorState problem={records.problem} onRetry={records.reload} />
      ) : records.loading ? (
        <LoadingRows rows={5} columns={5} label="Đang tải chấm công" />
      ) : list.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Chưa có lượt chấm công nào"
          description={`Không có lượt vào/ra ca trong ${rangeLabel(range)}. Chọn khoảng khác ở góc phải.`}
        />
      ) : (
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className={cn(
            "grid items-start gap-5 transition-opacity",
            seesTeam && perStaff.length > 1 && "xl:grid-cols-[minmax(0,1fr)_22rem]",
            records.stale && "opacity-70",
          )}
        >
          <motion.section variants={fadeUp} aria-label="Nhật ký chấm công" className="surface min-w-0 overflow-hidden rounded-2xl">
            <div className="grid gap-3 border-b p-4 sm:grid-cols-3 sm:p-5">
              <StatCard
                icon={Clock4}
                tone="ai"
                label="Tổng giờ làm"
                value={Math.round(totalMinutes / 60)}
                format={(n) => `${count(n)} giờ`}
                hint={rangeLabel(range)}
                className="shadow-none"
              />
              <StatCard
                icon={CalendarClock}
                label="Số ca"
                value={list.length}
                format={count}
                hint={`TB ${durationLabel(Math.round(totalMinutes / list.length))} mỗi ca`}
                className="shadow-none"
              />
              <StatCard
                icon={UserRoundCheck}
                tone="success"
                label="Đang trong ca"
                value={onShift.length}
                format={count}
                hint={onShift.length ? "Chưa bấm Ra ca" : "Không ai đang trong ca"}
                className="shadow-none"
              />
            </div>
            {/* Một bảng duy nhất (cột thẳng hàng giữa các ngày); mỗi ngày là một <tbody> mở đầu bằng dòng tiêu đề ngày. */}
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pl-5">Nhân viên</TableHead>
                  <TableHead>Vào – ra</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead className="hidden sm:table-cell">Nguồn</TableHead>
                  {isManager && (
                    <TableHead>
                      <span className="sr-only">Sửa</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              {byDay.map(([day, rows]) => (
                <TableBody key={day}>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead
                      scope="colgroup"
                      colSpan={isManager ? 5 : 4}
                      className="h-8 pl-5 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
                    >
                      {formatDayLong(day)}
                      <span className="ml-2 font-normal tracking-normal normal-case">· {rows.length} ca</span>
                    </TableHead>
                  </TableRow>
                  {rows.map((r) => {
                    const minutes = minutesBetween(r.clockInAt, r.clockOutAt, now);
                    const source = sourceLabel[r.source] ?? sourceLabel.self;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="w-full max-w-0 pl-5">
                          <span className="flex min-w-0 items-center gap-3">
                            <PersonAvatar name={nameOf(r.staffMemberId)} size="sm" />
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate font-medium">{nameOf(r.staffMemberId)}</span>
                              {r.note && <span className="truncate text-xs text-muted-foreground">{r.note}</span>}
                            </span>
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {formatTime(r.clockInAt, defaultTimeZone)} –{" "}
                          {r.clockOutAt ? formatTime(r.clockOutAt, defaultTimeZone) : <span className="font-medium text-success">đang làm</span>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground tabular-nums">{durationLabel(minutes)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className={source.className}>
                            {source.label}
                          </Badge>
                        </TableCell>
                        {isManager && (
                          <TableCell className="w-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-11 sm:size-8"
                              aria-label={`Sửa chấm công của ${nameOf(r.staffMemberId)}`}
                              onClick={() => setEditing(r)}
                            >
                              <Pencil aria-hidden />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              ))}
            </Table>
          </motion.section>

          {seesTeam && perStaff.length > 1 && (
            <motion.section variants={fadeUp} aria-labelledby="hours-title" className="surface flex flex-col gap-3 rounded-2xl p-5 xl:sticky xl:top-6">
              <div>
                <h2 id="hours-title" className="text-[15px] font-semibold tracking-tight">
                  Giờ làm theo người
                </h2>
                <p className="text-[13px] text-muted-foreground">{rangeLabel(range)}</p>
              </div>
              <ol className="flex flex-col gap-3">
                {perStaff.map((p) => (
                  <li key={p.id} className="flex items-center gap-3">
                    <PersonAvatar name={nameOf(p.id)} size="sm" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-medium">{nameOf(p.id)}</span>
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          {durationLabel(p.minutes)} · {p.shifts} ca
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <div
                          className="h-full rounded-full bg-ai"
                          style={{
                            width: `${(p.minutes / maxMinutes) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </motion.section>
          )}
        </motion.div>
      )}

      {editing && (
        <EditAttendanceDialog
          record={editing}
          staffName={nameOf(editing.staffMemberId)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
