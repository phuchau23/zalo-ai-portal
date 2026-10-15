"use client";

import { useState, type FormEvent } from "react";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { Field, describedBy } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Branch, Schemas, StaffMember, TeamMember } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { emptyToNull } from "@/lib/crm";

export type SaveStaff = Schemas["SaveStaffRequest"];

const NONE = "__none__";

/** Màu mặc định cho nhân viên mới (lịch hẹn tô theo màu này). Giá trị gửi lên BE, không phải màu giao diện. */
const defaultColor = "#4f7cf6";

/** Form thông tin nhân viên: dùng cho cả thêm mới (trong hộp thoại) và sửa (trong bảng chi tiết). */
export function StaffForm({
  idPrefix,
  initial,
  phone,
  branches,
  team,
  canEdit,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  idPrefix: string;
  initial: StaffMember | null;
  phone: string | null;
  branches: Branch[];
  /** Danh sách tài khoản đăng nhập để gắn; null = người dùng không được xem (BE 403) → ẩn ô này. */
  team: TeamMember[] | null;
  canEdit: boolean;
  submitLabel: string;
  onSubmit: (body: SaveStaff) => Promise<ApiProblem | null>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<SaveStaff>({
    branchId: initial?.branchId ?? branches.find((b) => b.isDefault)?.id ?? branches[0]?.id ?? "",
    displayName: initial?.displayName ?? "",
    title: initial?.title ?? null,
    phone: phone ?? null,
    color: initial?.color ?? defaultColor,
    bookable: initial?.bookable ?? true,
    userId: initial?.userId ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const errors = problem?.fieldErrors ?? {};
  const update = (patch: Partial<SaveStaff>) => {
    setValues({ ...values, ...patch });
    setSaved(false);
  };

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setProblem(null);
    const result = await onSubmit({
      ...values,
      displayName: values.displayName.trim(),
      title: emptyToNull(values.title),
      phone: emptyToNull(values.phone),
      color: values.color.toLowerCase(),
    });
    setSaving(false);
    if (result) return setProblem(result);
    setSaved(true);
  }

  const ro = !canEdit;
  const p = idPrefix;
  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
      {problem && !Object.keys(errors).length && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(problem)}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${p}-name`} label="Tên hiển thị" hint="Tên khách và đồng nghiệp thấy trên lịch." error={errors.displayName}>
          <Input
            id={`${p}-name`}
            required
            maxLength={100}
            value={values.displayName}
            disabled={ro}
            onChange={(e) => update({ displayName: e.target.value })}
            aria-invalid={Boolean(errors.displayName)}
            aria-describedby={describedBy(`${p}-name`, errors.displayName, true)}
            className="h-11 sm:h-9"
          />
        </Field>
        <Field id={`${p}-title`} label="Chức danh" hint="Ví dụ: Kỹ thuật viên, Bác sĩ, Lễ tân." error={errors.title}>
          <Input
            id={`${p}-title`}
            maxLength={100}
            value={values.title ?? ""}
            disabled={ro}
            onChange={(e) => update({ title: e.target.value })}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={describedBy(`${p}-title`, errors.title, true)}
            className="h-11 sm:h-9"
          />
        </Field>
        <Field id={`${p}-branch`} label="Chi nhánh" error={errors.branchId}>
          <Select value={values.branchId} onValueChange={(branchId) => update({ branchId })} disabled={ro || branches.length === 0}>
            <SelectTrigger id={`${p}-branch`} className="h-11 w-full sm:h-9" aria-invalid={Boolean(errors.branchId)}>
              <SelectValue placeholder="Chọn chi nhánh" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id={`${p}-phone`} label="Số điện thoại" hint="Chỉ nội bộ, không hiện cho khách." error={errors.phone}>
          <Input
            id={`${p}-phone`}
            type="tel"
            inputMode="tel"
            maxLength={20}
            value={values.phone ?? ""}
            disabled={ro}
            onChange={(e) => update({ phone: e.target.value })}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={describedBy(`${p}-phone`, errors.phone, true)}
            className="h-11 sm:h-9"
          />
        </Field>
        <Field id={`${p}-color`} label="Màu trên lịch" error={errors.color}>
          <div className="flex items-center gap-3">
            <Input
              id={`${p}-color`}
              type="color"
              value={values.color}
              disabled={ro}
              onChange={(e) => update({ color: e.target.value })}
              aria-invalid={Boolean(errors.color)}
              className="h-11 w-16 cursor-pointer p-1 sm:h-9"
            />
            <span className="font-mono text-xs text-muted-foreground">{values.color}</span>
          </div>
        </Field>
        {team && (
          <Field id={`${p}-user`} label="Tài khoản đăng nhập" hint="Gắn để người này thấy lịch của mình khi đăng nhập." error={errors.userId}>
            <Select value={values.userId ?? NONE} onValueChange={(v) => update({ userId: v === NONE ? null : v })} disabled={ro}>
              <SelectTrigger id={`${p}-user`} className="h-11 w-full sm:h-9" aria-invalid={Boolean(errors.userId)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Không gắn</SelectItem>
                {team.map((m) => (
                  <SelectItem key={m.userId} value={m.userId}>
                    {m.name} · {m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Label htmlFor={`${p}-bookable`} className="flex min-h-11 cursor-pointer items-center gap-2 self-end text-sm font-normal">
          <Checkbox id={`${p}-bookable`} checked={values.bookable} disabled={ro} onCheckedChange={(v) => update({ bookable: v === true })} />
          Nhận lịch hẹn
        </Label>
      </div>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" className="h-11 sm:h-9" disabled={saving || !values.displayName.trim() || !values.branchId}>
            {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
            {saving ? "Đang lưu..." : submitLabel}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={saving} onClick={onCancel}>
              Hủy
            </Button>
          )}
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
