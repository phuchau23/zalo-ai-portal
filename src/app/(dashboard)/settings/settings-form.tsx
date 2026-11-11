"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CircleAlert, CircleCheck, LoaderCircle, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import { FormGroup as Group, stickySaveBar } from "@/components/common/form-layout";
import { PersonAvatar } from "@/components/common/person-avatar";
import { ErrorState } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type Industry, type Schemas } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { cn } from "@/lib/utils";
import { FormSkeleton } from "./settings-ui";

type FormValues = Schemas["UpdateTenantSettingsRequest"];

export type SettingsSection = "business" | "bot" | "privacy";

/**
 * Thông tin doanh nghiệp + tên/xưng hô của bot + link chính sách. `sections` chọn nhóm hiện trên trang
 * (Cài đặt → Doanh nghiệp: business + privacy; Thiết lập trợ lý: bot). Lưu luôn gửi đủ mọi trường (giá trị đang có).
 */
export function SettingsForm({
  sections = ["business", "bot", "privacy"],
  inlineSave = false,
}: {
  sections?: SettingsSection[];
  /** Nút Lưu nằm ngay dưới form (khi form không ở cuối thẻ), thay vì thanh dính đáy thẻ. */
  inlineSave?: boolean;
}) {
  const { me, reload } = useSession();
  const canEdit = me.currentTenant?.role === "owner";

  const [values, setValues] = useState<FormValues | null>(null);
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loadProblem, setLoadProblem] = useState<ApiProblem | null>(null);
  const [saveProblem, setSaveProblem] = useState<ApiProblem | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [settings, industryList] = await Promise.all([
        call(() => api.GET("/tenant/settings")),
        call(() => api.GET("/industries")),
      ]);
      if (cancelled) return;
      if (!settings.ok) return setLoadProblem(settings.problem);
      if (!industryList.ok) return setLoadProblem(industryList.problem);

      const { name, industrySlug, botName, botPronoun, privacyUrl } = settings.data;
      setValues({ name, industrySlug, botName, botPronoun, privacyUrl });
      setIndustries(industryList.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [me.currentTenant?.id]);

  if (loadProblem) return <ErrorState problem={loadProblem} />;

  if (!values) return <FormSkeleton rows={Math.max(2, sections.length)} />;

  const update = (patch: Partial<FormValues>) => {
    setValues({ ...values, ...patch });
    setSaved(false);
    setDirty(true);
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values) return;
    setSaving(true);
    setSaveProblem(null);

    const body: FormValues = { ...values, privacyUrl: values.privacyUrl?.trim() ? values.privacyUrl.trim() : null };
    const result = await call(() => api.PUT("/tenant/settings", { body }));
    setSaving(false);

    if (result.ok) {
      setSaved(true);
      setDirty(false);
      await reload(); // tên doanh nghiệp trên thanh bên
    } else {
      setSaveProblem(result.problem);
    }
  }

  const fieldError = (field: keyof FormValues) => saveProblem?.fieldErrors[field];

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col">
      {!canEdit && (
        <Alert className="mt-4">
          <Lock aria-hidden />
          <AlertDescription>Bạn đang xem với quyền nhân viên. Chỉ chủ doanh nghiệp được sửa cài đặt.</AlertDescription>
        </Alert>
      )}
      {saveProblem && (
        <Alert variant="destructive" className="mt-4">
          <CircleAlert aria-hidden />
          <AlertDescription>{problemMessage(saveProblem)}</AlertDescription>
        </Alert>
      )}

      {sections.includes("business") && (
        <BusinessPreview
          name={values.name}
          industry={industries.find((i) => i.slug === values.industrySlug)?.name}
          privacyUrl={values.privacyUrl}
          showPrivacy={sections.includes("privacy")}
        />
      )}

      {sections.includes("business") && (
      <Group title="Doanh nghiệp" description="Tên hiển thị và ngành giúp bot hiểu bối cảnh khi trả lời.">
        <Field id="name" label="Tên doanh nghiệp" error={fieldError("name")}>
          <Input
            id="name"
            value={values.name}
            maxLength={200}
            disabled={!canEdit}
            aria-invalid={Boolean(fieldError("name"))}
            aria-describedby={describedBy("name", fieldError("name"))}
            onChange={(e) => update({ name: e.target.value })}
          />
        </Field>

        <Field id="industrySlug" label="Ngành" error={fieldError("industrySlug")}>
          <Select value={values.industrySlug} onValueChange={(industrySlug) => update({ industrySlug })} disabled={!canEdit}>
            <SelectTrigger
              id="industrySlug"
              className="w-full"
              aria-invalid={Boolean(fieldError("industrySlug"))}
              aria-describedby={describedBy("industrySlug", fieldError("industrySlug"))}
            >
              <SelectValue placeholder="Chọn ngành" />
            </SelectTrigger>
            <SelectContent>
              {industries.map((i) => (
                <SelectItem key={i.slug} value={i.slug}>
                  {i.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </Group>
      )}

      {sections.includes("bot") && (
      <Group title="Tên & xưng hô" description="Cách bot tự giới thiệu và xưng với khách. Khách luôn được báo đây là trợ lý AI.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="botName" label="Tên bot" hint="Tên bot tự giới thiệu với khách." error={fieldError("botName")}>
            <Input
              id="botName"
              value={values.botName}
              maxLength={100}
              disabled={!canEdit}
              aria-invalid={Boolean(fieldError("botName"))}
              aria-describedby={describedBy("botName", fieldError("botName"), true)}
              onChange={(e) => update({ botName: e.target.value })}
            />
          </Field>

          <Field id="botPronoun" label="Bot xưng là" hint='Ví dụ: "em", "mình".' error={fieldError("botPronoun")}>
            <Input
              id="botPronoun"
              value={values.botPronoun}
              maxLength={20}
              disabled={!canEdit}
              aria-invalid={Boolean(fieldError("botPronoun"))}
              aria-describedby={describedBy("botPronoun", fieldError("botPronoun"), true)}
              onChange={(e) => update({ botPronoun: e.target.value })}
            />
          </Field>
        </div>
      </Group>
      )}

      {sections.includes("privacy") && (
      <Group title="Bảo vệ dữ liệu cá nhân" description="Bắt buộc theo luật bảo vệ dữ liệu cá nhân.">
        <Field
          id="privacyUrl"
          label="Link chính sách bảo mật"
          hint="Bot gửi kèm link này trong tin chào đầu tiên. Phải bắt đầu bằng https://"
          error={fieldError("privacyUrl")}
        >
          <Input
            id="privacyUrl"
            type="url"
            inputMode="url"
            placeholder="https://"
            value={values.privacyUrl ?? ""}
            maxLength={500}
            disabled={!canEdit}
            aria-invalid={Boolean(fieldError("privacyUrl"))}
            aria-describedby={describedBy("privacyUrl", fieldError("privacyUrl"), true)}
            onChange={(e) => update({ privacyUrl: e.target.value })}
          />
        </Field>
      </Group>
      )}

      {canEdit && (
        <div className={inlineSave ? "flex items-center justify-end gap-3 pt-1" : stickySaveBar}>
          <p role="status" className="mr-auto text-sm text-muted-foreground">
            {saved ? (
              <span className="inline-flex items-center gap-1.5 text-success">
                <CircleCheck className="size-4" aria-hidden />
                Đã lưu cài đặt
              </span>
            ) : (
              dirty && "Có thay đổi chưa lưu"
            )}
          </p>
          <Button type="submit" disabled={saving || !dirty}>
            {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
            {saving ? "Đang lưu..." : "Lưu cài đặt"}
          </Button>
        </div>
      )}
    </form>
  );
}

/** Thẻ xem trước hồ sơ doanh nghiệp: đổi tên/ngành là thấy ngay; báo đã có link chính sách bảo mật chưa. */
function BusinessPreview({
  name,
  industry,
  privacyUrl,
  showPrivacy,
}: {
  name: string;
  industry: string | undefined;
  privacyUrl: string | null | undefined;
  showPrivacy: boolean;
}) {
  const hasPrivacy = Boolean(privacyUrl?.trim());
  return (
    <div className="relative mb-2 flex flex-col gap-4 overflow-hidden rounded-2xl border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:p-5">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/10 via-accent/40 to-transparent" />
      <PersonAvatar name={name || "Doanh nghiệp"} size="xl" className="relative" />
      <div className="relative flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Hồ sơ doanh nghiệp</span>
        <span className="truncate text-lg font-bold tracking-tight">{name.trim() || "Chưa đặt tên"}</span>
        <span className="text-sm text-muted-foreground">{industry ?? "Chưa chọn ngành"}</span>
      </div>
      {showPrivacy && (
        <span
          className={cn(
            "relative inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
            hasPrivacy ? "bg-success/10 text-success" : "bg-warning/10 text-warning",
          )}
        >
          {hasPrivacy ? <ShieldCheck className="size-3.5" aria-hidden /> : <ShieldAlert className="size-3.5" aria-hidden />}
          {hasPrivacy ? "Đã có chính sách bảo mật" : "Thiếu link chính sách bảo mật"}
        </span>
      )}
    </div>
  );
}

function describedBy(id: string, error: string | undefined, hasHint = false) {
  return error ? `${id}-error` : hasHint ? `${id}-hint` : undefined;
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
