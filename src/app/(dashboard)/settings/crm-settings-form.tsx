"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CircleAlert, CircleCheck, LoaderCircle, Lock } from "lucide-react";
import { Field, describedBy } from "@/components/common/field";
import { SectionHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type Schemas } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";

type FormValues = Schemas["UpdateCrmSettingsRequest"];

const slotOptions = [15, 30, 60] as const;

/** Cài đặt → Lịch & bán hàng: múi giờ, bước lịch hẹn, mức giảm giá cần duyệt, thời gian dọn mặc định. Chủ doanh nghiệp sửa; nhân viên xem. */
export function CrmSettingsForm() {
  const { me } = useSession();
  const canEdit = me.currentTenant?.role === "owner";
  const [values, setValues] = useState<FormValues | null>(null);
  const [loadProblem, setLoadProblem] = useState<ApiProblem | null>(null);
  const [saveProblem, setSaveProblem] = useState<ApiProblem | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await call(() => api.GET("/tenant/crm-settings"));
      if (cancelled) return;
      if (!result.ok) return setLoadProblem(result.problem);
      const { timeZone, slotMinutes, discountApprovalPercent, defaultBufferMinutes } = result.data;
      setValues({ timeZone, slotMinutes, discountApprovalPercent, defaultBufferMinutes });
    })();
    return () => {
      cancelled = true;
    };
  }, [me.currentTenant?.id]);

  const update = (patch: Partial<FormValues>) => {
    if (!values) return;
    setValues({ ...values, ...patch });
    setSaved(false);
    setDirty(true);
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values) return;
    setSaving(true);
    setSaveProblem(null);
    const result = await call(() => api.PUT("/tenant/crm-settings", { body: { ...values, timeZone: values.timeZone.trim() } }));
    setSaving(false);
    if (!result.ok) return setSaveProblem(result.problem);
    setSaved(true);
    setDirty(false);
  }

  const fieldError = (field: keyof FormValues) => saveProblem?.fieldErrors[field];

  return (
    <div id="crm" className="mt-10 flex scroll-mt-6 flex-col gap-4">
      <SectionHeader title="Lịch & bán hàng" description="Quy ước chung cho lịch hẹn và hóa đơn ở mọi chi nhánh." />
      {loadProblem ? (
        <ErrorState problem={loadProblem} />
      ) : !values ? (
        <div role="status" aria-label="Đang tải cài đặt" className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
          ))}
        </div>
      ) : (
        <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4 rounded-md border p-4">
          {!canEdit && (
            <Alert>
              <Lock aria-hidden />
              <AlertDescription>Chỉ chủ doanh nghiệp được sửa phần này.</AlertDescription>
            </Alert>
          )}
          {saveProblem && !Object.keys(saveProblem.fieldErrors).length && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>{problemMessage(saveProblem)}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="crm-timeZone" label="Múi giờ" hint="Ví dụ: Asia/Ho_Chi_Minh" error={fieldError("timeZone")}>
              <Input
                id="crm-timeZone"
                value={values.timeZone}
                maxLength={100}
                disabled={!canEdit}
                aria-invalid={Boolean(fieldError("timeZone"))}
                aria-describedby={describedBy("crm-timeZone", fieldError("timeZone"), true)}
                onChange={(e) => update({ timeZone: e.target.value })}
                className="h-11 sm:h-9"
              />
            </Field>
            <Field id="crm-slot" label="Bước lịch hẹn" hint="Khung giờ nhỏ nhất khi đặt lịch." error={fieldError("slotMinutes")}>
              <Select value={String(values.slotMinutes)} onValueChange={(v) => update({ slotMinutes: Number(v) })} disabled={!canEdit}>
                <SelectTrigger id="crm-slot" className="h-11 w-full sm:h-9" aria-invalid={Boolean(fieldError("slotMinutes"))}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {slotOptions.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {m} phút
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id="crm-discount"
              label="Giảm giá cần duyệt từ (%)"
              hint="Nhân viên giảm quá mức này phải có quyền “Giảm giá vượt mức”."
              error={fieldError("discountApprovalPercent")}
            >
              <Input
                id="crm-discount"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                value={values.discountApprovalPercent}
                disabled={!canEdit}
                aria-invalid={Boolean(fieldError("discountApprovalPercent"))}
                aria-describedby={describedBy("crm-discount", fieldError("discountApprovalPercent"), true)}
                onChange={(e) => update({ discountApprovalPercent: Number(e.target.value) })}
                className="h-11 sm:h-9"
              />
            </Field>
            <Field
              id="crm-buffer"
              label="Thời gian dọn mặc định (phút)"
              hint="Khoảng nghỉ giữa hai lịch hẹn nếu dịch vụ không đặt riêng."
              error={fieldError("defaultBufferMinutes")}
            >
              <Input
                id="crm-buffer"
                type="number"
                inputMode="numeric"
                min={0}
                max={120}
                value={values.defaultBufferMinutes}
                disabled={!canEdit}
                aria-invalid={Boolean(fieldError("defaultBufferMinutes"))}
                aria-describedby={describedBy("crm-buffer", fieldError("defaultBufferMinutes"), true)}
                onChange={(e) => update({ defaultBufferMinutes: Number(e.target.value) })}
                className="h-11 sm:h-9"
              />
            </Field>
          </div>
          {canEdit && (
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={saving || !dirty} className="h-11 sm:h-9">
                {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
                {saving ? "Đang lưu..." : "Lưu"}
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
      )}
    </div>
  );
}
