import type { Metadata } from "next";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Đăng nhập — Trợ lý Zalo AI" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <LoginForm next={safeRedirectPath(next)} />
    </main>
  );
}
