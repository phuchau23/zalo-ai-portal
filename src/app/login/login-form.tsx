"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BotMessageSquare, CircleAlert, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setProblem(null);

    const result = await call(() => api.POST("/auth/login", { body: { email, password } }));
    if (result.ok) {
      // BE đã đặt cookie phiên (httpOnly). replace để nút Back không quay lại trang đăng nhập.
      router.replace(next);
      router.refresh();
      return;
    }

    setProblem(result.problem);
    setSubmitting(false);
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="flex items-center gap-3 lg:hidden">
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-sm">
          <BotMessageSquare className="size-5" aria-hidden />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight">Trợ lý Zalo AI</span>
          <span className="text-sm text-muted-foreground">CRM & chăm sóc khách hàng</span>
        </span>
      </div>

      <div className="surface flex flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight">Chào mừng trở lại</h1>
          <p className="text-sm text-muted-foreground">Đăng nhập bằng email và mật khẩu doanh nghiệp đã cấp cho bạn.</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
          {problem && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>{problemMessage(problem)}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              placeholder="ten@doanhnghiep.vn"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
              aria-invalid={Boolean(problem?.fieldErrors.email)}
              aria-describedby={problem?.fieldErrors.email ? "email-error" : undefined}
            />
            {problem?.fieldErrors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {problem.fieldErrors.email}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Mật khẩu</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pr-12"
                aria-invalid={Boolean(problem?.fieldErrors.password)}
                aria-describedby={problem?.fieldErrors.password ? "password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                aria-pressed={showPassword}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
            {problem?.fieldErrors.password && (
              <p id="password-error" className="text-sm text-destructive">
                {problem.fieldErrors.password}
              </p>
            )}
          </div>

          <Button type="submit" size="lg" className="h-11 w-full" disabled={submitting || !email || !password}>
            {submitting && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Quên mật khẩu? Nhờ chủ doanh nghiệp cấp lại ở <span className="font-medium text-foreground">Cài đặt → Tài khoản & phân quyền</span>.
      </p>
    </div>
  );
}
