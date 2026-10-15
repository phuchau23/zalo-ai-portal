"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CalendarOff, ChevronRight, CircleAlert, CircleCheck, LoaderCircle, Lock, Plus, Star, Store, Trash2 } from "lucide-react";
import { Field } from "@/components/common/field";
import { SectionHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { WeekWindowsEditor } from "@/components/common/week-windows-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/components/session/session-provider";
import { call, type ApiResult } from "@/lib/api/call";
import { api, type Branch, type BranchClosure, type BranchHour, type Schemas } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { branchStatusLabels, emptyToNull, hasPermission, normalizeCode, statusOf } from "@/lib/crm";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { ResourcesEditor } from "./resources-section";

type SaveBranch = Schemas["SaveBranchRequest"];

/** Cài đặt → Chi nhánh. Ai cũng xem được; sửa cần quyền "Quản lý chi nhánh" (chủ doanh nghiệp luôn có). */
export function BranchesSection() {
  const { me } = useSession();
  const canEdit = hasPermission(me.currentTenant, "manage_branches");
  const { data, problem, loading, reload } = useApiData(() => call(() => api.GET("/branches", { params: { query: { includeInactive: true } } })));
  const [open, setOpen] = useState<string | null>(null);
  const [actionProblem, setActionProblem] = useState<ApiProblem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function act(branch: Branch, request: () => Promise<ApiResult<unknown>>) {
    setActionProblem(null);
    setBusyId(branch.id);
    const result = await request();
    setBusyId(null);
    if (!result.ok) setActionProblem(result.problem);
    reload();
  }

  return (
    <div id="branches" className="mt-10 flex scroll-mt-6 flex-col gap-4">
      <SectionHeader
        title="Chi nhánh"
        description="Cơ sở, giờ mở cửa và ngày nghỉ. Lịch hẹn, nhân viên và danh mục bán gắn theo chi nhánh."
      />

      {!canEdit && (
        <Alert>
          <Lock aria-hidden />
          <AlertDescription>Bạn chỉ xem được chi nhánh. Cần quyền &quot;Quản lý chi nhánh&quot; để sửa.</AlertDescription>
        </Alert>
      )}

      {canEdit && <AddBranchForm onAdded={reload} />}

      {actionProblem && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(actionProblem)}
        </p>
      )}

      {problem && !data ? (
        <ErrorState problem={problem} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingRows rows={2} columns={3} label="Đang tải chi nhánh" />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Store} title="Chưa có chi nhánh" description="Thêm chi nhánh đầu tiên để xếp lịch và nhân viên." />
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {data.map((b) => {
            const expanded = open === b.id;
            const status = statusOf(branchStatusLabels, b.status);
            const busy = busyId === b.id;
            return (
              <li key={b.id} className="flex flex-col">
                <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`branch-${b.id}`}
                    onClick={() => setOpen(expanded ? null : b.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-sm text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")} aria-hidden />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-2 font-medium">
                        {b.name}
                        {b.isDefault && <Badge variant="info">Mặc định</Badge>}
                        {b.status !== "active" && <Badge variant={status.variant}>{status.label}</Badge>}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        <span className="font-mono text-xs">{b.code}</span>
                        {b.address && ` · ${b.address}`}
                      </span>
                    </span>
                  </button>
                  {canEdit && (
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {!b.isDefault && b.status === "active" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-11 sm:h-8"
                          disabled={busy}
                          onClick={() => void act(b, () => call(() => api.POST("/branches/{branchId}/default", { params: { path: { branchId: b.id } } })))}
                        >
                          <Star aria-hidden />
                          Đặt mặc định
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn("h-11 sm:h-8", b.status === "active" && "text-destructive hover:bg-destructive/10 hover:text-destructive")}
                        disabled={busy}
                        onClick={() =>
                          void act(b, () =>
                            call(() =>
                              api.PATCH("/branches/{branchId}/status", {
                                params: { path: { branchId: b.id } },
                                body: { status: b.status === "active" ? "inactive" : "active" },
                              }),
                            ),
                          )
                        }
                      >
                        {b.status === "active" ? "Ngừng hoạt động" : "Kích hoạt"}
                      </Button>
                    </div>
                  )}
                </div>
                {expanded && (
                  <div id={`branch-${b.id}`} className="border-t bg-muted/30 px-4 py-4">
                    <BranchEditor branch={b} canEdit={canEdit} onChanged={reload} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function AddBranchForm({ onAdded }: { onAdded: () => void }) {
  const [values, setValues] = useState<SaveBranch>({ code: "", name: "", address: null, phone: null });
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const errors = problem?.fieldErrors ?? {};

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setProblem(null);
    const result = await call(() =>
      api.POST("/branches", {
        body: { code: normalizeCode(values.code), name: values.name.trim(), address: emptyToNull(values.address), phone: emptyToNull(values.phone) },
      }),
    );
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    setValues({ code: "", name: "", address: null, phone: null });
    onAdded();
  }

  return (
    <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3 rounded-md border p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[10rem_1fr_1fr_10rem_auto] lg:items-end">
        <Field id="branch-code" label="Mã" error={errors.code}>
          <Input
            id="branch-code"
            required
            maxLength={50}
            placeholder="CN-Q1"
            value={values.code}
            onChange={(e) => setValues({ ...values, code: e.target.value })}
            onBlur={() => setValues({ ...values, code: normalizeCode(values.code) })}
            aria-invalid={Boolean(errors.code)}
            className="h-11 font-mono sm:h-9"
          />
        </Field>
        <Field id="branch-name" label="Tên chi nhánh" error={errors.name}>
          <Input
            id="branch-name"
            required
            maxLength={200}
            value={values.name}
            onChange={(e) => setValues({ ...values, name: e.target.value })}
            aria-invalid={Boolean(errors.name)}
            className="h-11 sm:h-9"
          />
        </Field>
        <Field id="branch-address" label="Địa chỉ" error={errors.address}>
          <Input
            id="branch-address"
            maxLength={500}
            value={values.address ?? ""}
            onChange={(e) => setValues({ ...values, address: e.target.value })}
            aria-invalid={Boolean(errors.address)}
            className="h-11 sm:h-9"
          />
        </Field>
        <Field id="branch-phone" label="Điện thoại" error={errors.phone}>
          <Input
            id="branch-phone"
            type="tel"
            inputMode="tel"
            maxLength={20}
            value={values.phone ?? ""}
            onChange={(e) => setValues({ ...values, phone: e.target.value })}
            aria-invalid={Boolean(errors.phone)}
            className="h-11 sm:h-9"
          />
        </Field>
        <Button type="submit" disabled={saving || !values.code.trim() || !values.name.trim()} className="h-11 sm:h-9">
          <Plus aria-hidden />
          {saving ? "Đang thêm..." : "Thêm"}
        </Button>
      </div>
      {problem && !Object.keys(errors).length && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(problem)}
        </p>
      )}
    </form>
  );
}


/** Sửa thông tin, giờ mở cửa và ngày nghỉ của một chi nhánh. */
function BranchEditor({ branch, canEdit, onChanged }: { branch: Branch; canEdit: boolean; onChanged: () => void }) {
  const { data, problem, loading, reload } = useApiData(() => call(() => api.GET("/branches/{branchId}", { params: { path: { branchId: branch.id } } })));

  if (problem && !data) return <ErrorState problem={problem} onRetry={reload} />;
  if (!data) return <LoadingRows rows={2} columns={2} label="Đang tải chi nhánh" />;

  return (
    <div className={cn("flex flex-col gap-8", loading && "opacity-70")}>
      <BranchInfoForm
        branch={data.branch}
        canEdit={canEdit}
        onSaved={() => {
          reload();
          onChanged();
        }}
      />
      <HoursEditor branchId={branch.id} hours={data.hours} canEdit={canEdit} onSaved={reload} />
      <ClosuresEditor branchId={branch.id} closures={data.closures} canEdit={canEdit} onChanged={reload} />
      <ResourcesEditor branchId={branch.id} canEdit={canEdit} />
    </div>
  );
}

function BranchInfoForm({ branch, canEdit, onSaved }: { branch: Branch; canEdit: boolean; onSaved: () => void }) {
  const [values, setValues] = useState<SaveBranch>({ code: branch.code, name: branch.name, address: branch.address, phone: branch.phone });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const errors = problem?.fieldErrors ?? {};
  const update = (patch: Partial<SaveBranch>) => {
    setValues({ ...values, ...patch });
    setSaved(false);
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setProblem(null);
    const result = await call(() =>
      api.PUT("/branches/{branchId}", {
        params: { path: { branchId: branch.id } },
        body: { code: normalizeCode(values.code), name: values.name.trim(), address: emptyToNull(values.address), phone: emptyToNull(values.phone) },
      }),
    );
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    setSaved(true);
    onSaved();
  }

  const p = `b-${branch.id}`;
  return (
    <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">Thông tin</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id={`${p}-code`} label="Mã" error={errors.code}>
          <Input
            id={`${p}-code`}
            value={values.code}
            maxLength={50}
            disabled={!canEdit}
            onChange={(e) => update({ code: e.target.value })}
            onBlur={() => update({ code: normalizeCode(values.code) })}
            aria-invalid={Boolean(errors.code)}
            className="h-11 font-mono sm:h-9"
          />
        </Field>
        <Field id={`${p}-name`} label="Tên chi nhánh" error={errors.name}>
          <Input id={`${p}-name`} value={values.name} maxLength={200} disabled={!canEdit} onChange={(e) => update({ name: e.target.value })} aria-invalid={Boolean(errors.name)} className="h-11 sm:h-9" />
        </Field>
        <Field id={`${p}-address`} label="Địa chỉ" error={errors.address}>
          <Input id={`${p}-address`} value={values.address ?? ""} maxLength={500} disabled={!canEdit} onChange={(e) => update({ address: e.target.value })} aria-invalid={Boolean(errors.address)} className="h-11 sm:h-9" />
        </Field>
        <Field id={`${p}-phone`} label="Điện thoại" error={errors.phone}>
          <Input id={`${p}-phone`} type="tel" inputMode="tel" value={values.phone ?? ""} maxLength={20} disabled={!canEdit} onChange={(e) => update({ phone: e.target.value })} aria-invalid={Boolean(errors.phone)} className="h-11 sm:h-9" />
        </Field>
      </div>
      {problem && !Object.keys(errors).length && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(problem)}
        </p>
      )}
      {canEdit && (
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" className="h-11 sm:h-8" disabled={saving}>
            {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
            {saving ? "Đang lưu..." : "Lưu thông tin"}
          </Button>
          {saved && (
            <span role="status" className="inline-flex items-center gap-1.5 text-sm text-success">
              <CircleCheck className="size-4" aria-hidden />
              Đã lưu
            </span>
          )}
        </div>
      )}
    </form>
  );
}

/** Giờ mở cửa theo thứ; lưu bằng PUT /branches/{id}/hours. */
function HoursEditor({ branchId, hours, canEdit, onSaved }: { branchId: string; hours: BranchHour[]; canEdit: boolean; onSaved: () => void }) {
  const value = useMemo(() => hours.map((h) => ({ dayOfWeek: h.dayOfWeek, start: h.openTime, end: h.closeTime })), [hours]);
  return (
    <WeekWindowsEditor
      idPrefix={`h-${branchId}`}
      value={value}
      canEdit={canEdit}
      title="Giờ mở cửa"
      description="Ngày không có khung giờ là ngày nghỉ. Có thể thêm nhiều khung (sáng, chiều) trong một ngày."
      saveLabel="Lưu giờ mở cửa"
      onSave={async (rows) => {
        const result = await call(() =>
          api.PUT("/branches/{branchId}/hours", {
            params: { path: { branchId } },
            body: { hours: rows.map((r) => ({ dayOfWeek: r.dayOfWeek, openTime: r.start, closeTime: r.end })) },
          }),
        );
        if (!result.ok) return result.problem;
        onSaved();
        return null;
      }}
    />
  );
}

const closureDate = new Intl.DateTimeFormat("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });

function ClosuresEditor({ branchId, closures, canEdit, onChanged }: { branchId: string; closures: BranchClosure[]; canEdit: boolean; onChanged: () => void }) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setProblem(null);
    const result = await call(() => api.POST("/branches/{branchId}/closures", { params: { path: { branchId } }, body: { date, reason: emptyToNull(reason) } }));
    setBusy(false);
    if (!result.ok) return setProblem(result.problem);
    setDate("");
    setReason("");
    onChanged();
  }

  async function remove(closureId: string) {
    setBusy(true);
    setProblem(null);
    const result = await call(() => api.DELETE("/branches/{branchId}/closures/{closureId}", { params: { path: { branchId, closureId } } }));
    setBusy(false);
    if (!result.ok) setProblem(result.problem);
    onChanged();
  }

  const sorted = [...closures].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold">Ngày nghỉ</h3>
        <p className="text-sm text-muted-foreground">Lễ, Tết, nghỉ đột xuất. Những ngày này không nhận lịch hẹn.</p>
      </div>
      {canEdit && (
        <form noValidate onSubmit={(e) => void add(e)} className="grid gap-3 sm:grid-cols-[11rem_1fr_auto] sm:items-end">
          <Field id={`c-${branchId}-date`} label="Ngày" error={problem?.fieldErrors.date}>
            <Input id={`c-${branchId}-date`} type="date" required value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(problem?.fieldErrors.date)} className="h-11 sm:h-9" />
          </Field>
          <Field id={`c-${branchId}-reason`} label="Lý do" error={problem?.fieldErrors.reason}>
            <Input id={`c-${branchId}-reason`} maxLength={200} placeholder="Nghỉ Tết" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(problem?.fieldErrors.reason)} className="h-11 sm:h-9" />
          </Field>
          <Button type="submit" variant="outline" disabled={busy || !date} className="h-11 sm:h-9">
            <Plus aria-hidden />
            Thêm ngày nghỉ
          </Button>
        </form>
      )}
      {problem && !Object.keys(problem.fieldErrors).length && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(problem)}
        </p>
      )}
      {sorted.length === 0 ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarOff className="size-4" aria-hidden />
          Chưa có ngày nghỉ nào.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border bg-background">
          {sorted.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="tabular font-medium">{closureDate.format(new Date(`${c.date}T00:00:00`))}</span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{c.reason}</span>
              {canEdit && (
                <Button variant="ghost" size="icon-sm" className="size-11 sm:size-8" aria-label={`Bỏ ngày nghỉ ${c.date}`} disabled={busy} onClick={() => void remove(c.id)}>
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
