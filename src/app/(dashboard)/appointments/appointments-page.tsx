"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, CircleAlert, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type Appointment, type Branch, type BranchDetail, type StaffMember } from "@/lib/api/client";
import {
  addDays,
  appointmentStatuses,
  dateKeyOf,
  defaultTimeZone,
  formatDayLong,
  formatDayShort,
  gridRange,
  isDateKey,
  minutesOfDay,
  safeTimeZone,
  startOfDayIso,
  statusLabel,
  todayKey,
  weekDays,
  weekStart,
} from "@/lib/appointments";
import { hasPermission } from "@/lib/crm";
import { useApiData, useNow, usePolling } from "@/lib/use-api-data";
import { AppointmentDetailDialog } from "./appointment-detail";
import { AppointmentDialog, type CreatePreset, type DialogMode } from "./appointment-dialog";
import { DayView } from "./day-view";
import { ListView } from "./list-view";
import { WaitlistSection } from "./waitlist-section";
import { WeekView } from "./week-view";

type View = "day" | "week" | "list";

const ALL = "__all__";

const viewLabels: { value: View; label: string }[] = [
  { value: "day", label: "Ngày" },
  { value: "week", label: "Tuần" },
  { value: "list", label: "Danh sách" },
];

/** Lịch hẹn: xem theo ngày / tuần / danh sách, đặt lịch, xem chi tiết, hàng chờ. Tự tải lại mỗi 60 giây khi tab đang mở. */
export function AppointmentsPage() {
  const { me } = useSession();
  const searchParams = useSearchParams();
  const paramDate = searchParams.get("date");
  const paramContact = searchParams.get("contactId");
  const paramNew = searchParams.get("new") === "1";
  const canOverlap = hasPermission(me.currentTenant, "manage_staff");

  const settings = useApiData(() => call(() => api.GET("/tenant/crm-settings")));
  const branches = useApiData(() => call(() => api.GET("/branches", { params: { query: { includeInactive: false } } })));
  const staff = useApiData(() => call(() => api.GET("/staff", { params: { query: { includeInactive: false } } })));
  const services = useApiData(() => call(() => api.GET("/catalog", { params: { query: { kind: "service", includeInactive: false } } })));
  const packages = useApiData(() => call(() => api.GET("/catalog", { params: { query: { kind: "package", includeInactive: false } } })));

  const timeZone = safeTimeZone(settings.data?.timeZone ?? defaultTimeZone);
  const slotMinutes = settings.data?.slotMinutes ?? 30;
  const now = useNow(60_000);
  const today = todayKey(timeZone, now);

  const [view, setView] = useState<View>("day");
  const [date, setDate] = useState(() => (isDateKey(paramDate) ? paramDate : todayKey(defaultTimeZone)));
  const [selectedBranch, setSelectedBranch] = useState("");
  const [staffFilter, setStaffFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [tab, setTab] = useState<"calendar" | "waitlist">("calendar");
  // Từ hồ sơ khách (?contactId=) → mở sẵn hộp thoại đặt lịch cho khách đó; từ nút "Đặt lịch hẹn" ở Tổng quan (?new=1) → hộp thoại trống.
  const [dialog, setDialog] = useState<DialogMode | null>(() =>
    paramContact || paramNew
      ? { kind: "create", preset: { contactId: paramContact ?? undefined, date: isDateKey(paramDate) ? paramDate : undefined } }
      : null,
  );
  const [detailId, setDetailId] = useState<string | null>(null);

  const branchList: Branch[] = useMemo(() => branches.data ?? [], [branches.data]);

  // Chi nhánh đang xem: người dùng chọn; chưa chọn → chi nhánh của nhân viên (nếu bị giới hạn), rồi chi nhánh mặc định, rồi chi nhánh đầu.
  const branchId = useMemo(() => {
    if (selectedBranch && branchList.some((b) => b.id === selectedBranch)) return selectedBranch;
    const mine = me.currentTenant?.branchId;
    if (mine && branchList.some((b) => b.id === mine)) return mine;
    return branchList.find((b) => b.isDefault)?.id ?? branchList[0]?.id ?? "";
  }, [selectedBranch, branchList, me.currentTenant?.branchId]);

  const branchDetail = useApiData<BranchDetail | null>(() =>
    branchId ? call(() => api.GET("/branches/{branchId}", { params: { path: { branchId } } })) : Promise.resolve({ ok: true, data: null }),
  );
  useEffect(() => {
    branchDetail.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  // Khoảng ngày cần tải: ngày → 1 ngày; tuần / danh sách → tuần T2–CN chứa ngày đang xem.
  const rangeStart = view === "day" ? date : weekStart(date);
  const rangeDays = view === "day" ? 1 : 7;
  const from = startOfDayIso(rangeStart, timeZone);
  const to = startOfDayIso(addDays(rangeStart, rangeDays), timeZone);

  const appointments = useApiData<Appointment[]>(() =>
    branchId
      ? call(() =>
          api.GET("/appointments", {
            params: { query: { from, to, branchId, staffMemberId: staffFilter === ALL ? undefined : staffFilter, includeCancelled } },
          }),
        )
      : Promise.resolve({ ok: true, data: [] }),
  );
  useEffect(() => {
    appointments.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, branchId, staffFilter, includeCancelled, me.currentTenant?.id]);

  // Tự tải lại mỗi 60 giây khi tab trình duyệt đang hiện.
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  usePolling(visible && tab === "calendar", appointments.reload, 60_000);

  const staffList: StaffMember[] = useMemo(() => staff.data ?? [], [staff.data]);
  const branchStaff = useMemo(() => staffList.filter((s) => s.branchId === branchId && s.status === "active"), [staffList, branchId]);
  const bookableStaff = useMemo(
    () => branchStaff.filter((s) => s.bookable && (staffFilter === ALL || s.id === staffFilter)),
    [branchStaff, staffFilter],
  );
  const range = useMemo(() => gridRange(branchDetail.data?.hours), [branchDetail.data]);

  const rows = useMemo(() => appointments.data ?? [], [appointments.data]);
  const dayRows = useMemo(() => rows.filter((a) => dateKeyOf(a.startAt, timeZone) === date), [rows, date, timeZone]);
  const days = useMemo(() => weekDays(date), [date]);
  const byDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const a of rows) {
      const key = dateKeyOf(a.startAt, timeZone);
      (map[key] ??= []).push(a);
    }
    for (const key of Object.keys(map)) map[key].sort((a, b) => a.startAt.localeCompare(b.startAt));
    return map;
  }, [rows, timeZone]);
  const listRows = useMemo(() => rows.filter((a) => statusFilter === ALL || a.status === statusFilter), [rows, statusFilter]);

  function shift(direction: -1 | 1) {
    setDate((d) => addDays(d, direction * (view === "day" ? 1 : 7)));
  }

  function openCreate(preset: CreatePreset = {}) {
    setDialog({ kind: "create", preset: { branchId, ...preset } });
  }

  const loadingBase = !settings.data || !branches.data || !staff.data;
  const loadProblem =
    settings.problem && !settings.data ? settings.problem : branches.problem && !branches.data ? branches.problem : staff.problem && !staff.data ? staff.problem : null;
  const nowMinutes = date === today ? minutesOfDay(new Date(now).toISOString(), timeZone) : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={CalendarDays}
        title="Lịch hẹn"
        description="Lịch của từng nhân viên theo ngày. Bot đặt qua chat và nhân viên đặt tay đều hiện ở đây."
        help={
          <ul>
            <li>
              Bấm <strong>Đặt lịch</strong> (hoặc bấm vào ô trống trên lịch) để đặt cho khách gọi điện, khách đến trực tiếp. Hệ thống tự chặn giờ đã kín.
            </li>
            <li>
              Lịch do <strong>bot chốt qua Zalo</strong> hiện cùng chỗ, có nhãn nguồn &quot;Bot&quot;. Mở lịch để xem tóm tắt khách do AI viết cho kỹ thuật viên.
            </li>
            <li>
              Khách đến: mở lịch → <strong>Đã đến</strong> → <strong>Đang làm</strong> → <strong>Hoàn thành</strong>, rồi bấm <strong>Thanh toán</strong> để lập hóa đơn.
            </li>
            <li>
              Lịch trống vì chưa có người nhận? Vào <strong>Nhân viên</strong> để thêm nhân viên, ca làm và dịch vụ họ làm được.
            </li>
          </ul>
        }
        actions={
          <Button onClick={() => openCreate({ date })} className="h-11 sm:h-9" disabled={!branchId || loadingBase}>
            <Plus aria-hidden />
            Đặt lịch
          </Button>
        }
      />

      {loadProblem ? (
        <ErrorState
          problem={loadProblem}
          onRetry={() => {
            settings.reload();
            branches.reload();
            staff.reload();
          }}
        />
      ) : loadingBase ? (
        <LoadingRows rows={4} columns={3} label="Đang tải lịch hẹn" />
      ) : branchList.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Chưa có chi nhánh" description="Thêm chi nhánh và giờ mở cửa ở Cài đặt, rồi thêm nhân viên nhận lịch, trước khi đặt lịch." />
      ) : (
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="gap-0">
          <div className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
            <TabsList variant="line" className="group-data-horizontal/tabs:h-10">
              <TabsTrigger value="calendar">Lịch</TabsTrigger>
              <TabsTrigger value="waitlist">Hàng chờ</TabsTrigger>
            </TabsList>
            {branchList.length > 1 && (
              <Select
                value={branchId}
                onValueChange={(v) => {
                  setSelectedBranch(v);
                  setStaffFilter(ALL);
                }}
              >
                <SelectTrigger aria-label="Chi nhánh" className="h-11 w-full sm:h-9 sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branchList.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <TabsContent value="calendar" className="flex flex-col gap-4 pt-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
              <div className="flex items-center gap-1.5">
                <Button variant="outline" className="h-11 sm:h-9" onClick={() => setDate(today)}>
                  Hôm nay
                </Button>
                <Button variant="outline" size="icon" className="size-11 sm:size-9" aria-label={view === "day" ? "Ngày trước" : "Tuần trước"} onClick={() => shift(-1)}>
                  <ChevronLeft />
                </Button>
                <Button variant="outline" size="icon" className="size-11 sm:size-9" aria-label={view === "day" ? "Ngày sau" : "Tuần sau"} onClick={() => shift(1)}>
                  <ChevronRight />
                </Button>
                <Input
                  type="date"
                  aria-label="Chọn ngày"
                  value={date}
                  onChange={(e) => isDateKey(e.target.value) && setDate(e.target.value)}
                  className="h-11 w-40 sm:h-9"
                />
              </div>
              <p className="text-sm font-medium lg:order-last lg:ml-auto">
                {view === "day" ? formatDayLong(date) : `${formatDayShort(days[0])} – ${formatDayShort(days[6])}`}
              </p>
              <div role="group" aria-label="Kiểu xem" className="flex rounded-md border p-0.5">
                {viewLabels.map((v) => (
                  <Button
                    key={v.value}
                    variant={view === v.value ? "default" : "ghost"}
                    size="sm"
                    className="h-10 flex-1 sm:h-8"
                    aria-pressed={view === v.value}
                    onClick={() => setView(v.value)}
                  >
                    {v.label}
                  </Button>
                ))}
              </div>
              {branchStaff.length > 0 && (
                <Select value={staffFilter} onValueChange={setStaffFilter}>
                  <SelectTrigger aria-label="Lọc theo nhân viên" className="h-11 w-full sm:h-9 sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Mọi nhân viên</SelectItem>
                    {branchStaff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {view === "list" && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger aria-label="Lọc theo trạng thái" className="h-11 w-full sm:h-9 sm:w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Mọi trạng thái</SelectItem>
                    {appointmentStatuses.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel(s).label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Label htmlFor="apt-cancelled" className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-normal sm:min-h-0">
                <Checkbox id="apt-cancelled" checked={includeCancelled} onCheckedChange={(v) => setIncludeCancelled(v === true)} />
                Hiện lịch đã hủy
              </Label>
            </div>

            {bookableStaff.length === 0 && staffFilter === ALL && (
              <Alert>
                <CircleAlert aria-hidden />
                <AlertDescription>Chi nhánh này chưa có nhân viên nhận lịch. Thêm ở trang Nhân viên và bật &quot;Nhận lịch hẹn&quot;.</AlertDescription>
              </Alert>
            )}

            {appointments.problem && !appointments.data ? (
              <ErrorState problem={appointments.problem} onRetry={appointments.reload} />
            ) : !appointments.data ? (
              <LoadingRows rows={4} columns={3} label="Đang tải lịch hẹn" />
            ) : view === "day" ? (
              <DayView
                appointments={dayRows}
                staff={bookableStaff}
                range={range}
                slotMinutes={slotMinutes}
                timeZone={timeZone}
                nowMinutes={nowMinutes}
                onSelect={setDetailId}
                onCreateAt={(staffMemberId, time) => openCreate({ staffMemberId, date, time })}
              />
            ) : view === "week" ? (
              <WeekView
                days={days}
                byDay={byDay}
                staff={staffList}
                timeZone={timeZone}
                today={today}
                onSelect={setDetailId}
                onPickDay={(d) => {
                  setDate(d);
                  setView("day");
                }}
              />
            ) : listRows.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Không có lịch hẹn trong tuần này" description="Đổi tuần, bỏ lọc, hoặc đặt lịch mới.">
                <Button onClick={() => openCreate({ date })} className="h-11 sm:h-9">
                  <Plus aria-hidden />
                  Đặt lịch
                </Button>
              </EmptyState>
            ) : (
              <ListView appointments={listRows} timeZone={timeZone} onSelect={setDetailId} />
            )}
            {appointments.problem && appointments.data && (
              <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
                <CircleAlert className="size-4 shrink-0" aria-hidden />
                Không tải lại được lịch mới nhất; đang hiện dữ liệu cũ.
              </p>
            )}
          </TabsContent>

          <TabsContent value="waitlist" className="pt-4">
            <WaitlistSection branchId={branchId} timeZone={timeZone} services={services.data ?? []} staff={staffList} />
          </TabsContent>
        </Tabs>
      )}

      {dialog && (
        <AppointmentDialog
          mode={dialog}
          timeZone={timeZone}
          branches={branchList}
          staff={staffList}
          services={services.data ?? []}
          packages={packages.data ?? []}
          canOverlap={canOverlap}
          onClose={() => setDialog(null)}
          onSaved={appointments.reload}
        />
      )}

      {detailId && (
        <AppointmentDetailDialog
          appointmentId={detailId}
          timeZone={timeZone}
          staff={staffList}
          onClose={() => setDetailId(null)}
          onChanged={appointments.reload}
          onReschedule={(a) => {
            setDetailId(null);
            setDialog({ kind: "reschedule", appointment: a });
          }}
        />
      )}
    </div>
  );
}
