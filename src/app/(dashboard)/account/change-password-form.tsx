"use client";

import { useState, type FormEvent } from "react";
import { CircleAlert, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";

const minLength = 8;

export function ChangePasswordForm() {
  const { me } = useSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const mismatch = confirm.length > 0 && confirm !== next;
  const errors = problem?.fieldErrors ?? {};

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mismatch) return;
    setSaving(true);
    setProblem(null);
    setSaved(false);
    const result = await call(() => api.POST("/auth/change-password", { body: { currentPassword: current, newPassword: next } }));
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    setCurrent("");
    setNext("");
    setConfirm("");
    setSaved(true);
  }

  const general = problem && Object.keys(problem.fieldErrors).length === 0 ? problemMessage(problem) : null;
  return (
    <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex max-w-md flex-col gap-4 rounded-md border p-4">
      <p className="text-sm text-muted-foreground">
        Đăng nhập bằng <span className="font-medium text-foreground">{me.email}</span>
      </p>
      {/* Trình quản lý mật khẩu cần biết tên đăng nhập của biểu mẫu. */}
      <input type="email" name="username" autoComplete="username" value={me.email} readOnly hidden />
      <Field id="current-password" label="Mật khẩu hiện tại" error={errors.currentPassword ?? (general ?? undefined)}>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          required
          value={current}
          onChange={(e) => (setCurrent(e.target.value), setSaved(false))}
          aria-invalid={Boolean(errors.currentPassword ?? general)}
          className="h-11 sm:h-9"
        />
      </Field>
      <Field id="new-password" label="Mật khẩu mới" hint={`Ít nhất ${minLength} ký tự.`} error={errors.newPassword}>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={minLength}
          maxLength={200}
          value={next}
          onChange={(e) => (setNext(e.target.value), setSaved(false))}
          aria-invalid={Boolean(errors.newPassword)}
          className="h-11 sm:h-9"
        />
      </Field>
      <Field id="confirm-password" label="Nhập lại mật khẩu mới" error={mismatch ? "Hai mật khẩu mới chưa giống nhau." : undefined}>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => (setConfirm(e.target.value), setSaved(false))}
          aria-invalid={mismatch}
          className="h-11 sm:h-9"
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving || !current || next.length < minLength || mismatch} className="h-11 sm:h-9">
          <Save aria-hidden />
          {saving ? "Đang lưu..." : "Đổi mật khẩu"}
        </Button>
        {saved && (
          <p role="status" className="text-sm text-success">
            Đã đổi mật khẩu. Các máy khác đã bị đăng xuất.
          </p>
        )}
      </div>
    </form>
  );
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
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
