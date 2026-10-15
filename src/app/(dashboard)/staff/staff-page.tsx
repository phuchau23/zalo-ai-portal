"use client";

import { useMemo, useState } from "react";
import { ChevronRight, CircleAlert, Lock, Plus, UserRound, Users } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type Branch, type StaffMember, type TeamMember } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { branchName, hasPermission, staffStatusLabels, statusOf } from "@/lib/crm";
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
        title="Nhân viên & ca làm"
        description="Ai làm dịch vụ nào, ở chi nhánh nào, giờ nào. Lịch hẹn dựa vào đây để xếp người."
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {branchList.length > 1 && (
          <Select value={branchFilter} onValueChange={setBranchFilter}>
            <SelectTrigger aria-label="Lọc theo chi nhánh" className="h-11 w-full sm:h-9 sm:w-56">
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
        <Label htmlFor="staff-inactive" className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-normal sm:min-h-0">
          <Checkbox id="staff-inactive" checked={includeInactive} onCheckedChange={(v) => setIncludeInactive(v === true)} />
          Hiện người đã nghỉ {inactiveCount > 0 && <span className="tabular text-muted-foreground">({inactiveCount})</span>}
        </Label>
      </div>

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
        <ul className="flex flex-col divide-y rounded-md border">
          {rows.map((s) => {
            const expanded = open === s.id;
            const status = statusOf(staffStatusLabels, s.status);
            return (
              <li key={s.id} className="flex flex-col">
                <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`staff-${s.id}`}
                    onClick={() => setOpen(expanded ? null : s.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")} aria-hidden />
                    {/* Màu riêng của nhân viên do BE lưu (#rrggbb), dùng để nhận ra trên lịch; không phải màu giao diện. */}
                    <span className="size-3 shrink-0 rounded-full ring-1 ring-foreground/10" style={{ backgroundColor: s.color }} aria-hidden />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={cn("flex flex-wrap items-center gap-2 font-medium", s.status !== "active" && "text-muted-foreground")}>
                        {s.displayName}
                        {s.bookable && s.status === "active" && <Badge variant="info">Nhận lịch</Badge>}
                        {s.status !== "active" && <Badge variant={status.variant}>{status.label}</Badge>}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {[s.title, branchList.length > 1 || !s.branchId ? branchName(branchList, s.branchId) : null].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-11 sm:h-8", s.status === "active" && "text-destructive hover:bg-destructive/10 hover:text-destructive")}
                      disabled={busyId === s.id}
                      onClick={() => void toggleStatus(s)}
                    >
                      {s.status === "active" ? "Đánh dấu đã nghỉ" : "Làm lại"}
                    </Button>
                  )}
                </div>
                {expanded && (
                  <div id={`staff-${s.id}`} className="border-t bg-muted/30 px-4 py-4">
                    <StaffDetail staff={s} branches={branchList} team={team.data ?? null} services={services.data ?? []} canEdit={canEdit} onChanged={staff.reload} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {adding && (
        <Dialog open onOpenChange={(o) => !o && setAdding(false)}>
          <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Thêm nhân viên</DialogTitle>
              <DialogDescription>Sau khi thêm, mở hồ sơ để chọn dịch vụ làm được và ca cố định.</DialogDescription>
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
