"use client";

import { useState, type FormEvent } from "react";
import { BedDouble, CircleAlert, LoaderCircle, Pencil, Plus } from "lucide-react";
import { Field } from "@/components/common/field";
import { ErrorState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { call } from "@/lib/api/call";
import { api, type Resource } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";

type ResourceKind = "bed" | "room" | "device";

const kinds: { value: ResourceKind; label: string }[] = [
  { value: "bed", label: "Giường" },
  { value: "room", label: "Phòng" },
  { value: "device", label: "Máy / thiết bị" },
];

export function resourceKindLabel(value: string): string {
  return kinds.find((k) => k.value === value)?.label ?? value;
}

/** Giường / phòng / máy của một chi nhánh (Cài đặt → Chi nhánh). Xem: ai cũng được; sửa cần quyền "Quản lý chi nhánh". */
export function ResourcesEditor({ branchId, canEdit }: { branchId: string; canEdit: boolean }) {
  const { data, problem, reload } = useApiData(() => call(() => api.GET("/resources", { params: { query: { branchId, includeInactive: true } } })));
  const [actionProblem, setActionProblem] = useState<ApiProblem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);

  async function save(resource: Resource, patch: Partial<Pick<Resource, "name" | "kind" | "isActive">>): Promise<boolean> {
    setActionProblem(null);
    setBusyId(resource.id);
    const result = await call(() =>
      api.PUT("/resources/{resourceId}", {
        params: { path: { resourceId: resource.id } },
        body: { branchId: resource.branchId, name: resource.name, kind: resource.kind, isActive: resource.isActive, ...patch },
      }),
    );
    setBusyId(null);
    if (!result.ok) setActionProblem(result.problem);
    reload();
    return result.ok;
  }

  const sorted = [...(data ?? [])].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, "vi"));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold">Giường / phòng</h3>
        <p className="text-sm text-muted-foreground">Chỗ làm dịch vụ để xếp lịch không bị trùng. Chưa cần thì bỏ qua.</p>
      </div>

      {canEdit && <AddResourceForm branchId={branchId} onAdded={reload} />}

      {actionProblem && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(actionProblem)}
        </p>
      )}

      {problem && !data ? (
        <ErrorState problem={problem} onRetry={reload} />
      ) : !data ? (
        <div role="status" aria-label="Đang tải giường / phòng" className="h-10 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
      ) : sorted.length === 0 ? (
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <BedDouble className="size-4" aria-hidden />
          Chưa có giường / phòng nào.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border bg-background">
          {sorted.map((r) => {
            const busy = busyId === r.id;
            return (
              <li key={r.id} className="flex flex-col gap-2 px-3 py-2 text-sm">
                {editing === r.id ? (
                  <RenameForm
                    resource={r}
                    busy={busy}
                    onCancel={() => setEditing(null)}
                    onSave={async (name, kind) => {
                      if (await save(r, { name, kind })) setEditing(null);
                    }}
                  />
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("min-w-0 flex-1 truncate font-medium", !r.isActive && "text-muted-foreground")}>{r.name}</span>
                    <Badge variant="outline">{resourceKindLabel(r.kind)}</Badge>
                    {!r.isActive && <Badge variant="secondary">Ngừng dùng</Badge>}
                    {canEdit && (
                      <>
                        <Button variant="ghost" size="icon-sm" className="size-11 sm:size-8" aria-label={`Đổi tên ${r.name}`} disabled={busy} onClick={() => setEditing(r.id)}>
                          <Pencil />
                        </Button>
                        <Label htmlFor={`res-${r.id}-active`} className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-normal sm:min-h-8">
                          <Switch id={`res-${r.id}-active`} checked={r.isActive} disabled={busy} onCheckedChange={(v) => void save(r, { isActive: v })} />
                          Đang dùng
                        </Label>
                      </>
                    )}
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

function AddResourceForm({ branchId, onAdded }: { branchId: string; onAdded: () => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ResourceKind>("bed");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const errors = problem?.fieldErrors ?? {};

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setProblem(null);
    const result = await call(() => api.POST("/resources", { body: { branchId, name: name.trim(), kind, isActive: true } }));
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    setName("");
    onAdded();
  }

  const p = `res-new-${branchId}`;
  return (
    <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-2">
      <div className="grid gap-3 sm:grid-cols-[1fr_11rem_auto] sm:items-end">
        <Field id={`${p}-name`} label="Tên" error={errors.name}>
          <Input id={`${p}-name`} required maxLength={100} placeholder="Giường 1" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} className="h-11 sm:h-9" />
        </Field>
        <Field id={`${p}-kind`} label="Loại" error={errors.kind}>
          <Select value={kind} onValueChange={(v) => setKind(v as ResourceKind)}>
            <SelectTrigger id={`${p}-kind`} className="h-11 w-full sm:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kinds.map((k) => (
                <SelectItem key={k.value} value={k.value}>
                  {k.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Button type="submit" variant="outline" disabled={saving || !name.trim()} className="h-11 sm:h-9">
          {saving ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Plus aria-hidden />}
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

function RenameForm({
  resource,
  busy,
  onSave,
  onCancel,
}: {
  resource: Resource;
  busy: boolean;
  onSave: (name: string, kind: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(resource.name);
  const [kind, setKind] = useState(resource.kind);
  const p = `res-${resource.id}`;
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(name.trim(), kind);
      }}
      className="grid gap-2 sm:grid-cols-[1fr_11rem_auto_auto] sm:items-center"
    >
      <Input id={`${p}-name`} aria-label="Tên" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="h-11 sm:h-9" autoFocus />
      <Select value={kind} onValueChange={setKind}>
        <SelectTrigger aria-label="Loại" className="h-11 w-full sm:h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {kinds.map((k) => (
            <SelectItem key={k.value} value={k.value}>
              {k.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" className="h-11 sm:h-9" disabled={busy || !name.trim()}>
        {busy ? "Đang lưu..." : "Lưu"}
      </Button>
      <Button type="button" size="sm" variant="ghost" className="h-11 sm:h-9" disabled={busy} onClick={onCancel}>
        Hủy
      </Button>
    </form>
  );
}
