"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { ErrorState } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type Schemas } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { cn } from "@/lib/utils";
import { TelegramConnect } from "./telegram-connect";

type Values = Schemas["UpdateHandoffSettingsRequest"];

/** Thứ tự hiển thị Thứ 2 → Chủ nhật; bit theo API: 0 = Chủ nhật ... 6 = Thứ 7. */
const days = [
  { bit: 1, label: "T2" },
  { bit: 2, label: "T3" },
  { bit: 3, label: "T4" },
  { bit: 4, label: "T5" },
  { bit: 5, label: "T6" },
  { bit: 6, label: "T7" },
  { bit: 0, label: "CN" },
];

const careModes = [
  { value: "auto", label: "Bot tự nhắn (khuyên dùng)", description: "Bot tự hỏi thăm khách như một nhân viên; chỉ báo bạn khi cần người." },
  { value: "suggest", label: "Chỉ gợi ý", description: "AI soạn sẵn tin, nhân viên đọc, sửa rồi tự gửi ở trang Cần chăm sóc." },
];

const variablesHint = "Biến dùng được: {xung_ho}, {ten_doanh_nghiep}, {ten_nhan_vien}, {thoi_gian_phan_hoi}, {gio_mo_cua_tiep_theo}.";

/** Câu chuyển tiếp bot ↔ nhân viên, giờ làm việc, nhắc khi khách chờ lâu, Telegram (docs/FEATURE-SPECS.md mục 1). */
export function HandoffForm() {
  const { me } = useSession();
  const canEdit = me.currentTenant?.role === "owner";
  const [values, setValues] = useState<Values | null>(null);
  const [telegramReady, setTelegramReady] = useState(false);
  const [loadProblem, setLoadProblem] = useState<ApiProblem | null>(null);
  const [saveProblem, setSaveProblem] = useState<ApiProblem | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await call(() => api.GET("/tenant/handoff-settings"));
      if (cancelled) return;
      if (!result.ok) return setLoadProblem(result.problem);
      const { telegramConfigured, ...rest } = result.data;
      setTelegramReady(telegramConfigured);
      setValues(rest);
    })();
    return () => {
      cancelled = true;
    };
  }, [me.currentTenant?.id]);

  // Nhóm vừa kết nối (hoặc ngắt): cập nhật giá trị đang hiển thị mà không coi là "chưa lưu" — máy chủ đã lưu rồi.
  const onTelegramConnected = useCallback((chatId: string | null) => {
    setValues((v) => (v ? { ...v, telegramChatId: chatId } : v));
  }, []);

  if (loadProblem) return <ErrorState problem={loadProblem} />;
  if (!values) return <div role="status" aria-label="Đang tải" className="h-40 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />;

  const update = (patch: Partial<Values>) => {
    setValues({ ...values, ...patch });
    setSaved(false);
    setDirty(true);
  };
  const error = (field: keyof Values) => saveProblem?.fieldErrors[field];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values) return;
    setSaving(true);
    setSaveProblem(null);
    const result = await call(() =>
      api.PUT("/tenant/handoff-settings", { body: { ...values, telegramChatId: values.telegramChatId?.trim() ? values.telegramChatId.trim() : null } }),
    );
    setSaving(false);
    if (result.ok) {
      setSaved(true);
      setDirty(false);
    } else {
      setSaveProblem(result.problem);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      {saveProblem && Object.keys(saveProblem.fieldErrors).length === 0 && (
        <Alert variant="destructive" className="mt-4">
          <CircleAlert aria-hidden />
          <AlertDescription>{problemMessage(saveProblem)}</AlertDescription>
        </Alert>
      )}

      <Group title="Giờ làm việc" description="Ngoài giờ, bot vẫn trả lời nhưng câu chuyển nhân viên sẽ hẹn khách vào giờ mở cửa tiếp theo.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="openTime" label="Mở cửa" error={error("openTime")}>
            <Input id="openTime" type="time" value={values.openTime} disabled={!canEdit} onChange={(e) => update({ openTime: e.target.value })} />
          </Field>
          <Field id="closeTime" label="Đóng cửa" error={error("closeTime")}>
            <Input id="closeTime" type="time" value={values.closeTime} disabled={!canEdit} onChange={(e) => update({ closeTime: e.target.value })} />
          </Field>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Ngày làm việc</legend>
          <div className="flex flex-wrap gap-2">
            {days.map((d) => {
              const checked = (values.workingDays & (1 << d.bit)) !== 0;
              return (
                <Label
                  key={d.bit}
                  htmlFor={`day-${d.bit}`}
                  className="flex min-h-11 min-w-14 cursor-pointer items-center justify-center gap-2 rounded-md border px-3 font-normal has-data-checked:border-primary has-data-checked:bg-accent"
                >
                  <Checkbox
                    id={`day-${d.bit}`}
                    checked={checked}
                    disabled={!canEdit}
                    onCheckedChange={(v) => update({ workingDays: v ? values.workingDays | (1 << d.bit) : values.workingDays & ~(1 << d.bit) })}
                  />
                  {d.label}
                </Label>
              );
            })}
          </div>
        </fieldset>
        <Field id="responseTime" label="Thời gian phản hồi dự kiến" hint='Chèn vào câu chuyển nhân viên, ví dụ "15 phút".' error={error("responseTime")}>
          <Input id="responseTime" value={values.responseTime} maxLength={50} disabled={!canEdit} onChange={(e) => update({ responseTime: e.target.value })} />
        </Field>
      </Group>

      <Group title="Câu chuyển tiếp" description="Hệ thống tự gửi để khách biết đang nói chuyện với bot hay người, và phải chờ bao lâu.">
        <MessageField id="handoffMessage" label="Khi bot chuyển nhân viên (trong giờ)" value={values.handoffMessage} disabled={!canEdit} error={error("handoffMessage")} onChange={(v) => update({ handoffMessage: v })} />
        <MessageField id="afterHoursMessage" label="Khi bot chuyển nhân viên (ngoài giờ)" value={values.afterHoursMessage} disabled={!canEdit} error={error("afterHoursMessage")} onChange={(v) => update({ afterHoursMessage: v })} />
        <Toggle id="takeoverMessageEnabled" label="Gửi câu giới thiệu khi nhân viên tiếp quản" checked={values.takeoverMessageEnabled} disabled={!canEdit} onChange={(v) => update({ takeoverMessageEnabled: v })} />
        {values.takeoverMessageEnabled && (
          <MessageField id="takeoverMessage" label="Câu giới thiệu" value={values.takeoverMessage} disabled={!canEdit} error={error("takeoverMessage")} onChange={(v) => update({ takeoverMessage: v })} />
        )}
        <Toggle id="returnToBotMessageEnabled" label="Gửi câu khi trả lại cho bot" checked={values.returnToBotMessageEnabled} disabled={!canEdit} onChange={(v) => update({ returnToBotMessageEnabled: v })} />
        {values.returnToBotMessageEnabled && (
          <MessageField id="returnToBotMessage" label="Câu trả lại cho bot" value={values.returnToBotMessage} disabled={!canEdit} error={error("returnToBotMessage")} onChange={(v) => update({ returnToBotMessage: v })} />
        )}
        <Toggle id="staffSignatureEnabled" label='Thêm chữ ký "— Tên, CSKH" cuối tin nhân viên' checked={values.staffSignatureEnabled} disabled={!canEdit} onChange={(v) => update({ staffSignatureEnabled: v })} />
      </Group>

      <Group title="Thông báo nhân viên" description="Khi bot chuyển người hoặc khách chờ lâu, hệ thống báo cho nhóm nhân viên trên Telegram (chỉ báo loại sự việc và link, không gửi nội dung tin của khách).">
        <Field id="reminderMinutes" label="Nhắc lại khi khách chờ quá" error={error("reminderMinutes")}>
          <Select value={String(values.reminderMinutes)} onValueChange={(v) => update({ reminderMinutes: Number(v) })} disabled={!canEdit}>
            <SelectTrigger id="reminderMinutes" className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 15, 30, 60].map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m} phút
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <TelegramConnect
          ready={telegramReady}
          chatId={values.telegramChatId}
          canEdit={canEdit}
          error={error("telegramChatId")}
          onConnected={onTelegramConnected}
          onManualChange={(v) => update({ telegramChatId: v })}
        />
      </Group>

      <Group
        title="Chăm sóc khách chủ động (AI)"
        description="Khách im lặng quá số giờ dưới đây, hoặc tới giờ hẹn chăm sóc trong nhật ký khách: AI đọc lại cuộc trò chuyện rồi tự nhắn hỏi thăm, hoặc báo nhân viên khi cần người. Mỗi lần phân tích là một lần gọi AI có tính phí."
      >
        <Toggle id="careEnabled" label="Bật chăm sóc chủ động" checked={values.careEnabled ?? true} disabled={!canEdit} onChange={(v) => update({ careEnabled: v })} />
        {(values.careEnabled ?? true) && (
          <>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Ai nhắn khách?</legend>
              <RadioGroup
                value={(values.careAutoSend ?? true) ? "auto" : "suggest"}
                onValueChange={(v) => update({ careAutoSend: v === "auto" })}
                disabled={!canEdit}
                className="gap-2"
              >
                {careModes.map((mode) => (
                  <Label
                    key={mode.value}
                    htmlFor={`care-mode-${mode.value}`}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3 font-normal transition-colors hover:bg-muted/50",
                      ((values.careAutoSend ?? true) ? "auto" : "suggest") === mode.value && "border-primary bg-accent/50",
                      !canEdit && "cursor-not-allowed opacity-70",
                    )}
                  >
                    <RadioGroupItem id={`care-mode-${mode.value}`} value={mode.value} className="mt-0.5" />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{mode.label}</span>
                      <span className="text-sm text-muted-foreground">{mode.description}</span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </fieldset>
            <Field id="careColdHours" label="Chăm sóc khi khách im lặng quá" error={error("careColdHours")}>
              <Select value={String(values.careColdHours ?? 6)} onValueChange={(v) => update({ careColdHours: Number(v) })} disabled={!canEdit}>
                <SelectTrigger id="careColdHours" className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 4, 6, 12, 24, 48].map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {h} giờ
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {(values.careAutoSend ?? true) && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="careSendStart" label="Bot được nhắn từ" error={error("careSendStart")}>
                  <Input id="careSendStart" type="time" min="07:00" max="21:00" value={values.careSendStart ?? "08:00"} disabled={!canEdit} onChange={(e) => update({ careSendStart: e.target.value })} />
                </Field>
                <Field id="careSendEnd" label="đến" hint="Giờ Việt Nam, trong khoảng 07:00–21:00. Ngoài giờ, bot dời tin sang sáng hôm sau." error={error("careSendEnd")}>
                  <Input id="careSendEnd" type="time" min="07:00" max="21:00" value={values.careSendEnd ?? "20:00"} disabled={!canEdit} onChange={(e) => update({ careSendEnd: e.target.value })} />
                </Field>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Luôn áp dụng: mỗi lần khách im lặng bot chỉ nhắn 1 tin, cách tin trước ít nhất 24 giờ; khách nhắn &quot;hủy&quot; hoặc &quot;dừng&quot; thì bot không chủ động nhắn khách đó nữa. Tin ưu đãi, chuyện phàn nàn, sức khỏe luôn chuyển cho nhân viên.
            </p>
          </>
        )}
      </Group>

      {canEdit && (
        <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 md:-mx-8 md:px-8">
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
          <Button type="submit" disabled={saving || !dirty}>
            {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
            {saving ? "Đang lưu..." : "Lưu cài đặt chuyển tiếp"}
          </Button>
        </div>
      )}
    </form>
  );
}

function Group({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-b py-6 md:grid-cols-[16rem_1fr] md:gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex max-w-xl flex-col gap-5">{children}</div>
    </section>
  );
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

function MessageField({
  id,
  label,
  value,
  disabled,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field id={id} label={label} hint={variablesHint} error={error}>
      <Textarea id={id} value={value} rows={3} maxLength={500} disabled={disabled} aria-invalid={Boolean(error)} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function Toggle({ id, label, checked, disabled, onChange }: { id: string; label: string; checked: boolean; disabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <Label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3 font-normal">
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </Label>
  );
}
