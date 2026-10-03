"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CircleAlert, LoaderCircle, MessagesSquare } from "lucide-react";
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
    <div className="flex w-full max-w-sm flex-col gap-8">
      <div className="flex flex-col gap-2">
        <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground lg:hidden">
          <MessagesSquare className="size-5" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Đăng nhập</h1>
        <p className="text-sm text-muted-foreground">Dùng email và mật khẩu doanh nghiệp được cấp.</p>
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
            autoComplete="username"
            placeholder="ten@doanhnghiep.vn"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(problem?.fieldErrors.password)}
            aria-describedby={problem?.fieldErrors.password ? "password-error" : undefined}
          />
          {problem?.fieldErrors.password && (
            <p id="password-error" className="text-sm text-destructive">
              {problem.fieldErrors.password}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" disabled={submitting || !email || !password}>
          {submitting && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
          {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </Button>
      </form>
    </div>
  );
}
