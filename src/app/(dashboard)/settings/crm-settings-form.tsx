"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Bot, CalendarCog, CircleAlert, CircleCheck, LoaderCircle, Lock } from "lucide-react";
import { Field, describedBy } from "@/components/common/field";
import { FormGroup, stickySaveBar } from "@/components/common/form-layout";
import { SectionHeader } from "@/components/common/page-header";
import { ErrorState } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type Schemas } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { cn } from "@/lib/utils";
import { FormSkeleton } from "./settings-ui";

type FormValues = Schemas["UpdateCrmSettingsRequest"];

const slotOptions = [15, 30, 60] as const;

type NumberField = Extract<
  keyof FormValues,
  "botMaxPartySize" | "bookingLeadMinutes" | "maxBookingDaysAhead" | "cancelLeadHours" | "reminder1Hours" | "reminder2Hours"
>;

/** Các ô số của phần đặt lịch: nhãn + gợi ý ngắn + giới hạn nhập. */
const bookingNumberFields: { key: NumberField; label: string; hint: string; min: number; max: number }[] = [
  { key: "botMaxPartySize", label: "Bot nhận tối đa (người/lịch)", hint: "Đoàn đông hơn, bot chuyển nhân viên xếp.", min: 1, max: 20 },
  { key: "bookingLeadMinutes", label: "Đặt trước ít nhất (phút)", hint: "Khách không đặt được giờ gần hơn mức này.", min: 0, max: 1440 },
  { key: "maxBookingDaysAhead", label: "Đặt xa nhất (ngày)", hint: "Chỉ nhận lịch trong số ngày tới này.", min: 1, max: 365 },
  { key: "cancelLeadHours", label: "Đổi/hủy trước (giờ)", hint: "Sát giờ hơn mức này thì không tự đổi/hủy được.", min: 0, max: 720 },
  { key: "reminder1Hours", label: "Nhắc lần 1 trước (giờ)", hint: "0 = tắt. Bot nhắn khách qua Zalo trước giờ hẹn.", min: 0, max: 720 },
  { key: "reminder2Hours", label: "Nhắc lần 2 trước (giờ)", hint: "0 = tắt. Thường 2 giờ trước, kèm xin xác nhận.", min: 0, max: 720 },
];

/**
 * Cài đặt → Lịch & bán hàng: múi giờ, bước lịch hẹn, mức giảm giá cần duyệt, thời gian dọn mặc định,
 * và quy tắc đặt lịch (bot tự chốt, đặt trước, đổi/hủy, nhắc lịch). Chủ doanh nghiệp sửa; nhân viên xem.
 */
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
      const {
        timeZone,
        slotMinutes,
        discountApprovalPercent,
        defaultBufferMinutes,
        botBookingEnabled,
        botMaxPartySize,
        bookingLeadMinutes,
        maxBookingDaysAhead,
        cancelLeadHours,
        reminder1Hours,
        reminder2Hours,
      } = result.data;
      setValues({
        timeZone,
        slotMinutes,
        discountApprovalPercent,
        defaultBufferMinutes,
        botBookingEnabled,
        botMaxPartySize,
        bookingLeadMinutes,
        maxBookingDaysAhead,
        cancelLeadHours,
        reminder1Hours,
        reminder2Hours,
      });
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
    <div id="crm" className="flex flex-col gap-5">
      <SectionHeader icon={CalendarCog} title="Lịch & bán hàng" description="Quy ước chung cho lịch hẹn và hóa đơn ở mọi chi nhánh." />
      {loadProblem ? (
        <ErrorState problem={loadProblem} />
      ) : !values ? (
        <FormSkeleton rows={2} />
      ) : (
        <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col [&>[role=alert]]:mb-4 [&>[data-slot=alert]]:mb-4">
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
          <FormGroup title="Quy ước chung" description="Múi giờ, bước lịch hẹn, mức giảm giá cần duyệt và thời gian dọn giữa hai lịch.">
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
          </FormGroup>

          <FormGroup title="Đặt lịch" description="Áp dụng cho cả bot đặt qua chat lẫn nhân viên đặt trên lịch.">
          <Label
            htmlFor="crm-botBooking"
            className={cn(
              "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border bg-card p-3.5 text-sm font-normal transition-colors hover:border-ai/30",
              values.botBookingEnabled && "border-ai/30 bg-ai-soft/60",
              !canEdit && "cursor-not-allowed opacity-70",
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                values.botBookingEnabled ? "bg-ai text-white shadow-glow-ai" : "bg-muted text-muted-foreground",
              )}
              aria-hidden
            >
              <Bot className="size-4" />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="font-semibold">Bot tự chốt lịch qua chat</span>
              <span className="text-xs text-pretty text-muted-foreground">Tắt thì bot chỉ ghi nhận nhu cầu và chuyển nhân viên xếp lịch.</span>
            </span>
            <Switch id="crm-botBooking" checked={values.botBookingEnabled} disabled={!canEdit} onCheckedChange={(v) => update({ botBookingEnabled: v })} />
          </Label>
          <div className="grid gap-4 sm:grid-cols-2">
            {bookingNumberFields.map((f) => (
              <Field key={f.key} id={`crm-${f.key}`} label={f.label} hint={f.hint} error={fieldError(f.key)}>
                <Input
                  id={`crm-${f.key}`}
                  type="number"
                  inputMode="numeric"
                  min={f.min}
                  max={f.max}
                  value={values[f.key]}
                  disabled={!canEdit}
                  aria-invalid={Boolean(fieldError(f.key))}
                  aria-describedby={describedBy(`crm-${f.key}`, fieldError(f.key), true)}
                  onChange={(e) => update({ [f.key]: Number(e.target.value) })}
                  className="h-11 sm:h-9"
                />
              </Field>
            ))}
          </div>
          </FormGroup>
          {canEdit && (
            <div className={stickySaveBar}>
              <p role="status" className="mr-auto text-sm text-muted-foreground">
                {saved ? (
                  <span className="inline-flex items-center gap-1.5 text-success">
                    <CircleCheck className="size-4" aria-hidden />
                    Đã lưu
                  </span>
                ) : (
                  dirty && "Có thay đổi chưa lưu"
                )}
              </p>
              <Button type="submit" disabled={saving || !dirty} className="h-11 sm:h-9">
                {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
                {saving ? "Đang lưu..." : "Lưu cài đặt"}
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
