"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CircleAlert, CircleCheck, LoaderCircle, Lock } from "lucide-react";
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

type FormValues = Schemas["UpdateTenantSettingsRequest"];

export function SettingsForm() {
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

  if (!values) {
    return (
      <div role="status" aria-label="Đang tải cài đặt" className="flex flex-col gap-6 py-6">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="grid gap-4 md:grid-cols-[16rem_1fr]">
            <div className="h-4 w-32 animate-pulse rounded-sm bg-muted motion-reduce:animate-none" />
            <div className="h-9 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
          </div>
        ))}
      </div>
    );
  }

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

      <Group title="Bot" description="Cách bot giới thiệu và xưng hô với khách.">
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

      {canEdit && (
        <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur supports-backdrop-filter:bg-background/80 md:-mx-8 md:px-8">
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

function describedBy(id: string, error: string | undefined, hasHint = false) {
  return error ? `${id}-error` : hasHint ? `${id}-hint` : undefined;
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
