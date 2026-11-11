"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarOff, ChevronDown, Info, LoaderCircle, Lock, MapPin, Phone, Plus, Star, Store, Trash2 } from "lucide-react";
import { Field } from "@/components/common/field";
import { IconTile } from "@/components/common/icon-tile";
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
import { type ApiProblem } from "@/lib/api/problem";
import { branchStatusLabels, emptyToNull, hasPermission, normalizeCode, statusOf } from "@/lib/crm";
import { easeOut } from "@/lib/motion";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { ResourcesEditor } from "./resources-section";
import { ActionError, AddPanel, MotionItem, MotionList, SavedNote, SubCard } from "./settings-ui";

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
    <div id="branches" className="flex flex-col gap-5">
      <SectionHeader
        icon={MapPin}
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

      <ActionError problem={actionProblem} />

      {problem && !data ? (
        <ErrorState problem={problem} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingRows rows={2} columns={3} label="Đang tải chi nhánh" />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Store} title="Chưa có chi nhánh" description="Thêm chi nhánh đầu tiên để xếp lịch và nhân viên." />
      ) : (
        <MotionList label="Danh sách chi nhánh">
          {data.map((b) => {
            const expanded = open === b.id;
            const status = statusOf(branchStatusLabels, b.status);
            const busy = busyId === b.id;
            const inactive = b.status !== "active";
            return (
              <MotionItem key={b.id} className={cn("overflow-hidden", expanded && "border-primary/30 shadow-card-hover")}>
                <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-4">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`branch-${b.id}`}
                    onClick={() => setOpen(expanded ? null : b.id)}
                    className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    <IconTile icon={Store} tone={inactive ? "muted" : "primary"} variant={b.isDefault ? "solid" : "soft"} size="md" />
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className={cn("flex flex-wrap items-center gap-2 font-semibold", inactive && "text-muted-foreground")}>
                        {b.name}
                        {b.isDefault && (
                          <Badge variant="info" className="gap-1">
                            <Star aria-hidden />
                            Mặc định
                          </Badge>
                        )}
                        {inactive && <Badge variant={status.variant}>{status.label}</Badge>}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                        <span className="rounded-md bg-muted px-1.5 py-px font-mono text-xs text-foreground/75">{b.code}</span>
                        {b.address && (
                          <span className="inline-flex min-w-0 items-center gap-1">
                            <MapPin className="size-3.5 shrink-0" aria-hidden />
                            <span className="truncate">{b.address}</span>
                          </span>
                        )}
                        {b.phone && (
                          <span className="tabular inline-flex items-center gap-1">
                            <Phone className="size-3.5 shrink-0" aria-hidden />
                            {b.phone}
                          </span>
                        )}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-[transform,background-color] duration-200 group-hover:bg-accent group-hover:text-accent-foreground motion-reduce:transition-none",
                        expanded && "rotate-180 bg-accent text-accent-foreground",
                      )}
                      aria-hidden
                    >
                      <ChevronDown className="size-4" />
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
                        {busy && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
                        {b.status === "active" ? "Ngừng hoạt động" : "Kích hoạt"}
                      </Button>
                    </div>
                  )}
                </div>
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      id={`branch-${b.id}`}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25, ease: easeOut }}
                      className="border-t bg-muted/35 p-3 sm:p-4"
                    >
                      <BranchEditor branch={b} canEdit={canEdit} onChanged={reload} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </MotionItem>
            );
          })}
        </MotionList>
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
    <AddPanel icon={Plus} title="Thêm chi nhánh" description="Mã ngắn gọn, không dấu (ví dụ CN-Q1) để in trên hóa đơn và lọc lịch.">
      <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[9rem_1fr_1fr_9rem_auto] lg:items-end">
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
              className="h-11 bg-card font-mono sm:h-9"
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
              className="h-11 bg-card sm:h-9"
            />
          </Field>
          <Field id="branch-address" label="Địa chỉ" error={errors.address}>
            <Input
              id="branch-address"
              maxLength={500}
              value={values.address ?? ""}
              onChange={(e) => setValues({ ...values, address: e.target.value })}
              aria-invalid={Boolean(errors.address)}
              className="h-11 bg-card sm:h-9"
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
              className="h-11 bg-card sm:h-9"
            />
          </Field>
          <Button type="submit" disabled={saving || !values.code.trim() || !values.name.trim()} className="h-11 sm:h-9">
            {saving ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Plus aria-hidden />}
            {saving ? "Đang thêm..." : "Thêm"}
          </Button>
        </div>
        {!Object.keys(errors).length && <ActionError problem={problem} />}
      </form>
    </AddPanel>
  );
}

/** Sửa thông tin, giờ mở cửa và ngày nghỉ của một chi nhánh. */
function BranchEditor({ branch, canEdit, onChanged }: { branch: Branch; canEdit: boolean; onChanged: () => void }) {
  const { data, problem, loading, reload } = useApiData(() => call(() => api.GET("/branches/{branchId}", { params: { path: { branchId: branch.id } } })));

  if (problem && !data) return <ErrorState problem={problem} onRetry={reload} />;
  if (!data) return <LoadingRows rows={2} columns={2} label="Đang tải chi nhánh" />;

  return (
    <div className={cn("grid gap-3 transition-opacity xl:grid-cols-2", loading && "opacity-70")}>
      <BranchInfoForm
        branch={data.branch}
        canEdit={canEdit}
        onSaved={() => {
          reload();
          onChanged();
        }}
      />
      <ClosuresEditor branchId={branch.id} closures={data.closures} canEdit={canEdit} onChanged={reload} />
      <SubCard className="xl:col-span-2">
        <HoursEditor branchId={branch.id} hours={data.hours} canEdit={canEdit} onSaved={reload} />
      </SubCard>
      <SubCard className="xl:col-span-2">
        <ResourcesEditor branchId={branch.id} canEdit={canEdit} />
      </SubCard>
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
    <SubCard icon={Info} title="Thông tin" description="Tên, mã, địa chỉ và số điện thoại của cơ sở.">
      <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3">
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
        {!Object.keys(errors).length && <ActionError problem={problem} />}
        {canEdit && (
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" className="h-11 sm:h-8" disabled={saving}>
              {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
              {saving ? "Đang lưu..." : "Lưu thông tin"}
            </Button>
            <SavedNote show={saved} />
          </div>
        )}
      </form>
    </SubCard>
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

const closureDay = new Intl.DateTimeFormat("vi-VN", { day: "2-digit" });
const closureMonth = new Intl.DateTimeFormat("vi-VN", { month: "2-digit", year: "numeric" });
const closureWeekday = new Intl.DateTimeFormat("vi-VN", { weekday: "long" });

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
    <SubCard icon={CalendarOff} tone="warning" title="Ngày nghỉ" description="Lễ, Tết, nghỉ đột xuất. Những ngày này không nhận lịch hẹn.">
      {canEdit && (
        <form noValidate onSubmit={(e) => void add(e)} className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
          <Field id={`c-${branchId}-date`} label="Ngày" error={problem?.fieldErrors.date}>
            <Input id={`c-${branchId}-date`} type="date" required value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(problem?.fieldErrors.date)} className="h-11 sm:h-9" />
          </Field>
          <Field id={`c-${branchId}-reason`} label="Lý do" error={problem?.fieldErrors.reason}>
            <Input id={`c-${branchId}-reason`} maxLength={200} placeholder="Nghỉ Tết" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(problem?.fieldErrors.reason)} className="h-11 sm:h-9" />
          </Field>
          <Button type="submit" variant="outline" disabled={busy || !date} className="h-11 sm:h-9">
            <Plus aria-hidden />
            Thêm
          </Button>
        </form>
      )}
      {problem && !Object.keys(problem.fieldErrors).length && <ActionError problem={problem} />}
      {sorted.length === 0 ? (
        <p className="flex items-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm text-muted-foreground">
          <CalendarOff className="size-4 shrink-0" aria-hidden />
          Chưa có ngày nghỉ nào — chi nhánh mở cửa theo giờ bên dưới.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((c) => {
            const day = new Date(`${c.date}T00:00:00`);
            return (
              <li key={c.id} className="flex items-center gap-3 rounded-xl border bg-background p-2 pr-1 text-sm">
                <span className="flex w-14 shrink-0 flex-col items-center rounded-lg bg-warning/10 py-1 leading-tight text-warning" aria-hidden>
                  <span className="tabular text-base font-bold">{closureDay.format(day)}</span>
                  <span className="tabular text-[10px] font-medium">{closureMonth.format(day)}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium first-letter:uppercase">
                    <span className="sr-only">{c.date} </span>
                    {closureWeekday.format(day)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{c.reason || "Không ghi lý do"}</span>
                </span>
                {canEdit && (
                  <Button variant="ghost" size="icon-sm" className="size-11 text-muted-foreground hover:text-destructive sm:size-8" aria-label={`Bỏ ngày nghỉ ${c.date}`} disabled={busy} onClick={() => void remove(c.id)}>
                    <Trash2 />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SubCard>
  );
}
