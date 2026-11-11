"use client";

import { useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { Check, CircleAlert, Eye, EyeOff, KeyRound, LoaderCircle, Save, ShieldCheck } from "lucide-react";
import { IconTile } from "@/components/common/icon-tile";
import { PersonAvatar } from "@/components/common/person-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { cn } from "@/lib/utils";
import { SavedNote } from "../settings/settings-ui";

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
  // Chỉ để người dùng thấy ngay mật khẩu mới đã đạt chưa; điều kiện thật vẫn do BE kiểm.
  const checks = [
    { ok: next.length >= minLength, label: `Ít nhất ${minLength} ký tự` },
    { ok: next.length > 0 && next !== current, label: "Khác mật khẩu hiện tại" },
    { ok: confirm.length > 0 && confirm === next, label: "Hai lần nhập giống nhau" },
  ];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)]">
      <form noValidate onSubmit={(e) => void onSubmit(e)} className="surface flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <IconTile icon={KeyRound} variant="solid" size="md" />
          <div className="flex min-w-0 flex-col">
            <h2 className="text-base font-semibold tracking-tight">Đổi mật khẩu</h2>
            <p className="text-sm text-muted-foreground">Đổi xong, các máy khác sẽ phải đăng nhập lại.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
          <PersonAvatar name={me.name} size="sm" />
          <p className="min-w-0 text-sm text-muted-foreground">
            Đăng nhập bằng <span className="font-medium break-all text-foreground">{me.email}</span>
          </p>
        </div>

        {/* Trình quản lý mật khẩu cần biết tên đăng nhập của biểu mẫu. */}
        <input type="email" name="username" autoComplete="username" value={me.email} readOnly hidden />
        <Field id="current-password" label="Mật khẩu hiện tại" error={errors.currentPassword ?? (general ?? undefined)}>
          <PasswordInput
            id="current-password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => (setCurrent(e.target.value), setSaved(false))}
            aria-invalid={Boolean(errors.currentPassword ?? general)}
          />
        </Field>
        <Field id="new-password" label="Mật khẩu mới" error={errors.newPassword}>
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            required
            minLength={minLength}
            maxLength={200}
            value={next}
            onChange={(e) => (setNext(e.target.value), setSaved(false))}
            aria-invalid={Boolean(errors.newPassword)}
            aria-describedby="new-password-checks"
          />
        </Field>
        <Field id="confirm-password" label="Nhập lại mật khẩu mới" error={mismatch ? "Hai mật khẩu mới chưa giống nhau." : undefined}>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => (setConfirm(e.target.value), setSaved(false))}
            aria-invalid={mismatch}
          />
        </Field>

        <ul id="new-password-checks" className="flex flex-col gap-1.5 text-sm" aria-label="Yêu cầu mật khẩu mới">
          {checks.map((c) => (
            <li key={c.label} className={cn("flex items-center gap-2 transition-colors", c.ok ? "text-success" : "text-muted-foreground")}>
              <span
                className={cn("flex size-4 items-center justify-center rounded-full border transition-colors", c.ok ? "border-success bg-success text-white" : "border-border")}
                aria-hidden
              >
                {c.ok && <Check className="size-3" />}
              </span>
              {c.label}
              <span className="sr-only">{c.ok ? ": đạt" : ": chưa đạt"}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center gap-3 border-t pt-4">
          <Button type="submit" disabled={saving || !current || next.length < minLength || mismatch} className="h-11 sm:h-9">
            {saving ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Save aria-hidden />}
            {saving ? "Đang lưu..." : "Đổi mật khẩu"}
          </Button>
          <SavedNote show={saved}>Đã đổi mật khẩu. Các máy khác đã bị đăng xuất.</SavedNote>
        </div>
      </form>

      <aside className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border bg-card p-5 shadow-card sm:p-6">
        <div className="relative flex items-center gap-3">
          <IconTile icon={ShieldCheck} tone="success" size="md" />
          <h2 className="text-base font-semibold tracking-tight">Giữ tài khoản an toàn</h2>
        </div>
        <ul className="relative flex flex-col gap-3 text-sm text-pretty text-muted-foreground">
          <Tip>Mỗi người một tài khoản riêng — không dùng chung mật khẩu với nhân viên.</Tip>
          <Tip>Dùng cụm từ dài dễ nhớ (ví dụ 3–4 từ ghép), tránh ngày sinh, số điện thoại.</Tip>
          <Tip>Mới nhận mật khẩu tạm từ chủ doanh nghiệp? Đổi ngay ở đây.</Tip>
          <Tip>Nghi bị lộ mật khẩu: đổi mật khẩu — mọi máy khác bị đăng xuất ngay.</Tip>
        </ul>
      </aside>
    </div>
  );
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

/** Ô mật khẩu có nút hiện/ẩn (vẫn dán được, vẫn dùng được trình quản lý mật khẩu). */
function PasswordInput({ className, ...props }: Omit<ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className={cn("h-11 pr-11 sm:h-10", className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        aria-pressed={visible}
        aria-controls={props.id}
        className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
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
