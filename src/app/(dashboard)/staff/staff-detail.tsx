"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CalendarOff, CircleAlert, CircleCheck, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { Field } from "@/components/common/field";
import { ErrorState, LoadingRows } from "@/components/common/states";
import { WeekWindowsEditor } from "@/components/common/week-windows-editor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { call } from "@/lib/api/call";
import { api, type Branch, type CatalogItem, type StaffMember, type TeamMember, type TimeOff } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { emptyToNull, localToIso } from "@/lib/crm";
import { formatDateTime } from "@/lib/format";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { StaffForm } from "./staff-form";

/** Bảng chi tiết một nhân viên: thông tin, dịch vụ làm được, ca cố định, nghỉ phép. */
export function StaffDetail({
  staff,
  branches,
  team,
  services,
  canEdit,
  onChanged,
}: {
  staff: StaffMember;
  branches: Branch[];
  team: TeamMember[] | null;
  services: CatalogItem[];
  canEdit: boolean;
  onChanged: () => void;
}) {
  const { data, problem, loading, reload } = useApiData(() => call(() => api.GET("/staff/{staffId}", { params: { path: { staffId: staff.id } } })));

  if (problem && !data) return <ErrorState problem={problem} onRetry={reload} />;
  if (!data) return <LoadingRows rows={2} columns={2} label="Đang tải nhân viên" />;

  return (
    <div className={cn("flex flex-col gap-8", loading && "opacity-70")}>
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold">Thông tin</h3>
        <StaffForm
          idPrefix={`s-${staff.id}`}
          initial={data.staff}
          phone={data.phone}
          branches={branches}
          team={team}
          canEdit={canEdit}
          submitLabel="Lưu thông tin"
          onSubmit={async (body) => {
            const result = await call(() => api.PUT("/staff/{staffId}", { params: { path: { staffId: staff.id } }, body }));
            if (!result.ok) return result.problem;
            reload();
            onChanged();
            return null;
          }}
        />
      </section>

      <ServicesEditor staffId={staff.id} serviceIds={data.serviceIds} services={services} canEdit={canEdit} onSaved={reload} />

      <ShiftTemplatesEditor staffId={staff.id} templates={data.shiftTemplates} canEdit={canEdit} onSaved={reload} />

      <TimeOffEditor staffId={staff.id} timeOff={data.timeOff} canEdit={canEdit} onChanged={reload} />
    </div>
  );
}

function ServicesEditor({
  staffId,
  serviceIds,
  services,
  canEdit,
  onSaved,
}: {
  staffId: string;
  serviceIds: string[];
  services: CatalogItem[];
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [all, setAll] = useState(serviceIds.length === 0);
  const [selected, setSelected] = useState<string[]>(serviceIds);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);

  async function save() {
    setSaving(true);
    setProblem(null);
    const result = await call(() => api.PUT("/staff/{staffId}/services", { params: { path: { staffId } }, body: { serviceIds: all ? [] : selected } }));
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    setSaved(true);
    onSaved();
  }

  const touch = () => {
    setSaved(false);
    setProblem(null);
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold">Dịch vụ làm được</h3>
        <p className="text-sm text-muted-foreground">Khi đặt lịch chỉ gợi ý nhân viên làm được dịch vụ đó.</p>
      </div>
      <Label htmlFor={`sv-${staffId}-all`} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-normal sm:min-h-9">
        <Checkbox
          id={`sv-${staffId}-all`}
          checked={all}
          disabled={!canEdit}
          onCheckedChange={(v) => {
            setAll(v === true);
            touch();
          }}
        />
        Làm được mọi dịch vụ
      </Label>
      {!all &&
        (services.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có dịch vụ nào trong Danh mục.</p>
        ) : (
          <div className="grid gap-1 rounded-md border bg-background p-2 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => {
              const id = `sv-${staffId}-${s.id}`;
              return (
                <Label key={s.id} htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm font-normal hover:bg-muted sm:min-h-9">
                  <Checkbox
                    id={id}
                    checked={selected.includes(s.id)}
                    disabled={!canEdit}
                    onCheckedChange={(v) => {
                      setSelected((ids) => (v === true ? [...ids.filter((x) => x !== s.id), s.id] : ids.filter((x) => x !== s.id)));
                      touch();
                    }}
                  />
                  <span className="truncate">{s.name}</span>
                </Label>
              );
            })}
          </div>
        ))}
      {problem && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(problem)}
        </p>
      )}
      {canEdit && (
        <div className="flex items-center gap-3">
          <Button type="button" size="sm" className="h-11 sm:h-8" disabled={saving} onClick={() => void save()}>
            {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
            {saving ? "Đang lưu..." : "Lưu dịch vụ"}
          </Button>
          {saved && (
            <span role="status" className="inline-flex items-center gap-1.5 text-sm text-success">
              <CircleCheck className="size-4" aria-hidden />
              Đã lưu
            </span>
          )}
        </div>
      )}
    </section>
  );
}

function ShiftTemplatesEditor({
  staffId,
  templates,
  canEdit,
  onSaved,
}: {
  staffId: string;
  templates: { dayOfWeek: number; startTime: string; endTime: string }[];
  canEdit: boolean;
  onSaved: () => void;
}) {
  const value = useMemo(() => templates.map((t) => ({ dayOfWeek: t.dayOfWeek, start: t.startTime, end: t.endTime })), [templates]);
  return (
    <WeekWindowsEditor
      idPrefix={`sh-${staffId}`}
      value={value}
      canEdit={canEdit}
      title="Ca cố định"
      description="Lịch làm việc lặp lại hằng tuần. Ngày không có ca là ngày nghỉ. Nghỉ phép bên dưới sẽ trừ khỏi ca."
      emptyLabel="Không làm"
      saveLabel="Lưu ca cố định"
      onSave={async (rows) => {
        const result = await call(() =>
          api.PUT("/staff/{staffId}/shift-templates", {
            params: { path: { staffId } },
            body: { templates: rows.map((r) => ({ dayOfWeek: r.dayOfWeek, startTime: r.start, endTime: r.end })) },
          }),
        );
        if (!result.ok) return result.problem;
        onSaved();
        return null;
      }}
    />
  );
}

function TimeOffEditor({ staffId, timeOff, canEdit, onChanged }: { staffId: string; timeOff: TimeOff[]; canEdit: boolean; onChanged: () => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<ApiProblem | null>(null);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fromAt = localToIso(from);
    const toAt = localToIso(to);
    if (!fromAt || !toAt) return setError("Chọn đủ thời điểm bắt đầu và kết thúc.");
    if (fromAt >= toAt) return setError("Thời điểm kết thúc phải sau bắt đầu.");
    setError(null);
    setBusy(true);
    setProblem(null);
    const result = await call(() => api.POST("/staff/{staffId}/time-off", { params: { path: { staffId } }, body: { fromAt, toAt, reason: emptyToNull(reason) } }));
    setBusy(false);
    if (!result.ok) return setProblem(result.problem);
    setFrom("");
    setTo("");
    setReason("");
    onChanged();
  }

  async function remove(timeOffId: string) {
    setBusy(true);
    setProblem(null);
    const result = await call(() => api.DELETE("/staff/{staffId}/time-off/{timeOffId}", { params: { path: { staffId, timeOffId } } }));
    setBusy(false);
    if (!result.ok) setProblem(result.problem);
    onChanged();
  }

  const sorted = [...timeOff].sort((a, b) => b.fromAt.localeCompare(a.fromAt));
  const p = `to-${staffId}`;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold">Nghỉ phép</h3>
        <p className="text-sm text-muted-foreground">Trong khoảng này không nhận lịch hẹn cho nhân viên.</p>
      </div>
      {canEdit && (
        <form noValidate onSubmit={(e) => void add(e)} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end">
          <Field id={`${p}-from`} label="Từ" error={problem?.fieldErrors.fromAt}>
            <Input id={`${p}-from`} type="datetime-local" required value={from} onChange={(e) => setFrom(e.target.value)} aria-invalid={Boolean(problem?.fieldErrors.fromAt)} className="h-11 sm:h-9" />
          </Field>
          <Field id={`${p}-to`} label="Đến" error={problem?.fieldErrors.toAt}>
            <Input id={`${p}-to`} type="datetime-local" required value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} aria-invalid={Boolean(problem?.fieldErrors.toAt)} className="h-11 sm:h-9" />
          </Field>
          <Field id={`${p}-reason`} label="Lý do" error={problem?.fieldErrors.reason}>
            <Input id={`${p}-reason`} maxLength={200} placeholder="Nghỉ ốm, việc gia đình" value={reason} onChange={(e) => setReason(e.target.value)} aria-invalid={Boolean(problem?.fieldErrors.reason)} className="h-11 sm:h-9" />
          </Field>
          <Button type="submit" variant="outline" disabled={busy || !from || !to} className="h-11 sm:h-9">
            <Plus aria-hidden />
            Thêm nghỉ phép
          </Button>
        </form>
      )}
      {(error || (problem && !Object.keys(problem.fieldErrors).length)) && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {error ?? (problem && problemMessage(problem))}
        </p>
      )}
      {sorted.length === 0 ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarOff className="size-4" aria-hidden />
          Chưa có lịch nghỉ nào.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border bg-background">
          {sorted.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="tabular font-medium">
                {formatDateTime(t.fromAt)} → {formatDateTime(t.toAt)}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{t.reason}</span>
              {canEdit && (
                <Button type="button" variant="ghost" size="icon-sm" className="size-11 sm:size-8" aria-label="Bỏ lịch nghỉ" disabled={busy} onClick={() => void remove(t.id)}>
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
