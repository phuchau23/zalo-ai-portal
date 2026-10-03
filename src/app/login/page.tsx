import type { Metadata } from "next";
import { MessagesSquare } from "lucide-react";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Đăng nhập — Trợ lý Zalo AI" };

const points = [
  "Bot trả lời khách trên Zalo OA theo đúng bảng giá, dịch vụ của bạn.",
  "Nhập dữ liệu từ Excel, xem trước thay đổi rồi mới áp dụng.",
  "Nhân viên tiếp quản hội thoại khi khách cần người thật.",
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <main className="grid flex-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary-foreground text-primary">
            <MessagesSquare className="size-4" aria-hidden />
          </span>
          <span className="font-semibold tracking-tight">Trợ lý Zalo AI</span>
        </div>
        <div className="flex max-w-md flex-col gap-6">
          <p className="text-2xl leading-snug font-semibold text-balance">Chăm sóc khách hàng trên Zalo, 24/7, bằng dữ liệu của chính bạn.</p>
          <ul className="flex flex-col gap-3 border-l border-primary-foreground/30 pl-4 text-sm">
            {points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs">Trang quản trị dành cho doanh nghiệp</p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <LoginForm next={safeRedirectPath(next)} />
      </section>
    </main>
  );
}
