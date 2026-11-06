"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { CalendarCheck, ChevronRight, CircleAlert, KeyRound, Lock, Plus, Store, UserRound, UserRoundCheck, UserRoundPlus, UserRoundX, Users } from "lucide-react";
import { IconTile } from "@/components/common/icon-tile";
import { FilterPills } from "@/components/common/filter-pills";
import { PageHeader } from "@/components/common/page-header";
import { PersonAvatar } from "@/components/common/person-avatar";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type Branch, type StaffMember, type TeamMember } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { branchName, hasPermission, staffStatusLabels, statusOf } from "@/lib/crm";
import { fadeUp, stagger } from "@/lib/motion";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { StaffDetail } from "./staff-detail";
import { StaffForm } from "./staff-form";

const ALL = "__all__";

/** Nhân viên & ca làm. Ai cũng xem được; sửa cần quyền "Quản lý nhân viên & ca làm". */
export function StaffPage() {
  const { me } = useSession();
  const canEdit = hasPermission(me.currentTenant, "manage_staff");
  const isOwner = me.currentTenant?.role === "owner";

  const staff = useApiData(() => call(() => api.GET("/staff", { params: { query: { includeInactive: true } } })));
  const branches = useApiData(() => call(() => api.GET("/branches", { params: { query: { includeInactive: false } } })));
  const services = useApiData(() => call(() => api.GET("/catalog", { params: { query: { kind: "service", includeInactive: false } } })));
  // Danh sách tài khoản chỉ chủ doanh nghiệp xem được (BE 403 với người khác) → không gọi, ẩn ô "Tài khoản đăng nhập".
  const team = useApiData<TeamMember[] | null>(() => (isOwner ? call(() => api.GET("/tenant/team")) : Promise.resolve({ ok: true, data: null })));

  const [branchFilter, setBranchFilter] = useState(ALL);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [actionProblem, setActionProblem] = useState<ApiProblem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const branchList: Branch[] = branches.data ?? [];
  const rows = useMemo(
    () => (staff.data ?? []).filter((s) => (includeInactive || s.status === "active") && (branchFilter === ALL || s.branchId === branchFilter)),
    [staff.data, includeInactive, branchFilter],
  );
  const inactiveCount = (staff.data ?? []).filter((s) => s.status !== "active").length;
  const openStaff = (staff.data ?? []).find((s) => s.id === open) ?? null;

  async function toggleStatus(member: StaffMember) {
    setActionProblem(null);
    setBusyId(member.id);
    const result = await call(() =>
      api.PATCH("/staff/{staffId}/status", { params: { path: { staffId: member.id } }, body: { status: member.status === "active" ? "inactive" : "active" } }),
    );
    setBusyId(null);
    if (!result.ok) setActionProblem(result.problem);
    staff.reload();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Users}
        title="Nhân viên & ca làm"
        description="Ai làm dịch vụ nào, ở chi nhánh nào, giờ nào. Lịch hẹn dựa vào đây để xếp người."
        help={
          <ul>
            <li>
              Thêm nhân viên → mở hồ sơ để chọn <strong>dịch vụ làm được</strong>, <strong>ca cố định</strong> theo thứ và ngày nghỉ phép.
            </li>
            <li>Bot và lịch hẹn chỉ xếp khách vào người có ca và làm được dịch vụ đó.</li>
            <li>
              Đây là hồ sơ làm việc. Tài khoản đăng nhập của nhân viên tạo ở <strong>Cài đặt → Tài khoản & phân quyền</strong>, rồi gắn với hồ sơ ở đây.
            </li>
          </ul>
        }
        actions={
          canEdit && (
            <Button onClick={() => setAdding(true)} className="h-11 sm:h-9" disabled={branchList.length === 0}>
              <Plus aria-hidden />
              Thêm nhân viên
            </Button>
          )
        }
      />

      {!canEdit && (
        <Alert>
          <Lock aria-hidden />
          <AlertDescription>Bạn chỉ xem được danh sách. Cần quyền &quot;Quản lý nhân viên &amp; ca làm&quot; để thêm hoặc sửa.</AlertDescription>
        </Alert>
      )}

      {canEdit && branches.data && branchList.length === 0 && (
        <Alert>
          <CircleAlert aria-hidden />
          <AlertDescription>Chưa có chi nhánh nào. Thêm chi nhánh ở Cài đặt trước khi thêm nhân viên.</AlertDescription>
        </Alert>
      )}

      {(staff.data?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <FilterPills
            label="Lọc nhân viên theo trạng thái"
            value={includeInactive ? "all" : "active"}
            onChange={(v) => setIncludeInactive(v === "all")}
            options={[
              { value: "active", label: "Đang làm", count: (staff.data ?? []).length - inactiveCount },
              { value: "all", label: "Tất cả", count: (staff.data ?? []).length },
            ]}
          />
          {branchList.length > 1 && (
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger aria-label="Lọc theo chi nhánh" className="h-11 w-full rounded-xl bg-card shadow-card sm:h-10 sm:w-56 *:data-[slot=select-value]:flex-1">
                <Store className="text-muted-foreground" aria-hidden />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Mọi chi nhánh</SelectItem>
                {branchList.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {actionProblem && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(actionProblem)}
        </p>
      )}

      {staff.problem && !staff.data ? (
        <ErrorState problem={staff.problem} onRetry={staff.reload} />
      ) : !staff.data ? (
        <LoadingRows rows={3} columns={3} label="Đang tải nhân viên" />
      ) : staff.data.length === 0 ? (
        <EmptyState icon={Users} title="Chưa có nhân viên" description="Thêm nhân viên, chọn dịch vụ họ làm được và ca cố định để xếp lịch hẹn.">
          {canEdit && branchList.length > 0 && (
            <Button onClick={() => setAdding(true)} className="h-11 sm:h-9">
              <Plus aria-hidden />
              Thêm nhân viên
            </Button>
          )}
        </EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState icon={UserRound} title="Không có ai khớp bộ lọc">
          <Button
            variant="outline"
            className="h-11 sm:h-9"
            onClick={() => {
              setBranchFilter(ALL);
              setIncludeInactive(true);
            }}
          >
            Xóa bộ lọc
          </Button>
        </EmptyState>
      ) : (
        <motion.ul variants={stagger} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((s) => {
            const status = statusOf(staffStatusLabels, s.status);
            const active = s.status === "active";
            const showBranch = branchList.length > 1 || !s.branchId;
            return (
              <motion.li key={s.id} variants={fadeUp} className={cn("surface lift group flex flex-col overflow-hidden rounded-2xl", !active && "opacity-75")}>
                {/* Dải màu riêng của nhân viên do BE lưu (#rrggbb) — màu nhận ra trên lịch, không phải màu giao diện. */}
                <span className="h-1.5 w-full shrink-0" style={{ backgroundColor: s.color }} aria-hidden />
                <button
                  type="button"
                  onClick={() => setOpen(s.id)}
                  aria-haspopup="dialog"
                  className="flex flex-1 cursor-pointer flex-col gap-4 p-4 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset"
                >
                  <span className="flex items-center gap-3">
                    <PersonAvatar
                      name={s.displayName}
                      size="lg"
                      badge={active ? <span className="size-3 rounded-full bg-success ring-2 ring-card" /> : undefined}
                    />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-semibold transition-colors group-hover:text-primary">{s.displayName}</span>
                      <span className="truncate text-sm text-muted-foreground">{s.title ?? "Chưa có chức danh"}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {active ? (
                      s.bookable ? (
                        <Badge variant="info">
                          <CalendarCheck aria-hidden />
                          Nhận lịch
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Không nhận lịch</Badge>
                      )
                    ) : (
                      <Badge variant={status.variant}>{status.label}</Badge>
                    )}
                    {showBranch && (
                      <Badge variant="outline">
                        <Store aria-hidden />
                        {branchName(branchList, s.branchId)}
                      </Badge>
                    )}
                    {s.userId && (
                      <Badge variant="secondary">
                        <KeyRound aria-hidden />
                        Có tài khoản
                      </Badge>
                    )}
                  </span>
                </button>
                <div className="flex min-h-12 items-center justify-between gap-2 border-t bg-muted/30 px-4 py-1.5">
                  <span className="text-xs text-muted-foreground">Bấm để xem dịch vụ, ca làm, nghỉ phép</span>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-11 shrink-0 sm:h-8", active && "text-destructive hover:bg-destructive/10 hover:text-destructive")}
                      disabled={busyId === s.id}
                      onClick={() => void toggleStatus(s)}
                    >
                      {active ? <UserRoundX aria-hidden /> : <UserRoundCheck aria-hidden />}
                      {active ? "Đã nghỉ" : "Làm lại"}
                      <span className="sr-only"> — {s.displayName}</span>
                    </Button>
                  )}
                </div>
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      {openStaff && (
        <Dialog open onOpenChange={(o) => !o && setOpen(null)}>
          <DialogContent className="max-h-[calc(100svh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-3xl">
            <div className="relative overflow-hidden border-b px-5 pt-6 pb-5 sm:px-6">
              <div aria-hidden className="absolute inset-x-0 top-0 h-full bg-primary/[0.07]" />
              <div aria-hidden className="absolute inset-x-0 top-0 h-full bg-dot-grid opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
              <DialogHeader className="relative flex-row items-center gap-4 text-left">
                <PersonAvatar name={openStaff.displayName} size="xl" />
                <div className="flex min-w-0 flex-col gap-1">
                  <DialogTitle className="text-lg">{openStaff.displayName}</DialogTitle>
                  <DialogDescription>
                    {[openStaff.title, branchName(branchList, openStaff.branchId), statusOf(staffStatusLabels, openStaff.status).label].filter(Boolean).join(" · ")}
                  </DialogDescription>
                </div>
              </DialogHeader>
            </div>
            <div className="px-5 py-5 sm:px-6">
              <StaffDetail staff={openStaff} branches={branchList} team={team.data ?? null} services={services.data ?? []} canEdit={canEdit} onChanged={staff.reload} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {adding && (
        <Dialog open onOpenChange={(o) => !o && setAdding(false)}>
          <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
            <DialogHeader className="flex-row items-center gap-3 text-left">
              <IconTile icon={UserRoundPlus} variant="solid" size="md" />
              <div className="flex min-w-0 flex-col gap-1">
                <DialogTitle>Thêm nhân viên</DialogTitle>
                <DialogDescription>Sau khi thêm, hồ sơ mở ra để chọn dịch vụ làm được và ca cố định.</DialogDescription>
              </div>
            </DialogHeader>
            <StaffForm
              idPrefix="s-new"
              initial={null}
              phone={null}
              branches={branchList}
              team={team.data ?? null}
              canEdit
              submitLabel="Thêm"
              onCancel={() => setAdding(false)}
              onSubmit={async (body) => {
                const result = await call(() => api.POST("/staff", { body }));
                if (!result.ok) return result.problem;
                setAdding(false);
                staff.reload();
                setOpen(result.data.id);
                return null;
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
