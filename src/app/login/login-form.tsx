"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Trợ lý Zalo AI</CardTitle>
        <CardDescription>Đăng nhập trang quản trị doanh nghiệp</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {problem && (
            <Alert variant="destructive">
              <AlertDescription>{problemMessage(problem)}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(problem?.fieldErrors.email)}
            />
            {problem?.fieldErrors.email && <p className="text-sm text-destructive">{problem.fieldErrors.email}</p>}
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
            />
            {problem?.fieldErrors.password && (
              <p className="text-sm text-destructive">{problem.fieldErrors.password}</p>
            )}
          </div>

          <Button type="submit" disabled={submitting || !email || !password}>
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
