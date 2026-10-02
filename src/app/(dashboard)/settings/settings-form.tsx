"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
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

  if (loadProblem) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{problemMessage(loadProblem)}</AlertDescription>
      </Alert>
    );
  }

  if (!values) {
    return <p className="text-muted-foreground">Đang tải...</p>;
  }

  const update = (patch: Partial<FormValues>) => {
    setValues({ ...values, ...patch });
    setSaved(false);
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
      await reload(); // tên doanh nghiệp trên thanh trên cùng
    } else {
      setSaveProblem(result.problem);
    }
  }

  const fieldError = (field: keyof FormValues) => saveProblem?.fieldErrors[field];

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardContent className="flex flex-col gap-5">
          {!canEdit && (
            <Alert>
              <AlertDescription>Bạn đang xem với quyền nhân viên. Chỉ chủ doanh nghiệp được sửa cài đặt.</AlertDescription>
            </Alert>
          )}
          {saveProblem && (
            <Alert variant="destructive">
              <AlertDescription>{problemMessage(saveProblem)}</AlertDescription>
            </Alert>
          )}
          {saved && (
            <Alert>
              <AlertDescription>Đã lưu cài đặt.</AlertDescription>
            </Alert>
          )}

          <Field id="name" label="Tên doanh nghiệp" error={fieldError("name")}>
            <Input
              id="name"
              value={values.name}
              maxLength={200}
              disabled={!canEdit}
              aria-invalid={Boolean(fieldError("name"))}
              onChange={(e) => update({ name: e.target.value })}
            />
          </Field>

          <Field id="industrySlug" label="Ngành" error={fieldError("industrySlug")}>
            <Select value={values.industrySlug} onValueChange={(industrySlug) => update({ industrySlug })} disabled={!canEdit}>
              <SelectTrigger id="industrySlug" className="w-full" aria-invalid={Boolean(fieldError("industrySlug"))}>
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

          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="botName" label="Tên bot" hint="Tên bot tự giới thiệu với khách." error={fieldError("botName")}>
              <Input
                id="botName"
                value={values.botName}
                maxLength={100}
                disabled={!canEdit}
                aria-invalid={Boolean(fieldError("botName"))}
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
                onChange={(e) => update({ botPronoun: e.target.value })}
              />
            </Field>
          </div>

          <Field
            id="privacyUrl"
            label="Link chính sách bảo mật"
            hint="Bot gửi kèm link này trong tin chào đầu tiên (bắt buộc theo luật bảo vệ dữ liệu cá nhân). Phải bắt đầu bằng https://"
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
              onChange={(e) => update({ privacyUrl: e.target.value })}
            />
          </Field>
        </CardContent>

        {canEdit && (
          <CardFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu cài đặt"}
            </Button>
          </CardFooter>
        )}
      </Card>
    </form>
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
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        hint && <p className="text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
