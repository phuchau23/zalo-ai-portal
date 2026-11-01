import type { Metadata } from "next";
import { Bot, BotMessageSquare, CalendarCheck2, ReceiptText, ShieldCheck, TrendingUp, type LucideIcon } from "lucide-react";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Đăng nhập — Trợ lý Zalo AI" };

const points: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Bot, title: "Trả lời khách 24/7", text: "Bot nhắn Zalo như nhân viên thật, đúng bảng giá và dịch vụ của bạn." },
  { icon: CalendarCheck2, title: "Tự chốt và nhắc lịch", text: "Kiểm tra chỗ trống, giữ lịch, nhắc khách, hỏi thăm sau buổi làm." },
  { icon: ReceiptText, title: "Bán hàng & gói liệu trình", text: "Hóa đơn, mã QR chuyển khoản, gói trừ buổi, kho, nhân viên." },
  { icon: TrendingUp, title: "Báo cáo rõ ràng", text: "Doanh thu mỗi ngày, và bot mang về bao nhiêu tiền cho bạn." },
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <main className="grid flex-1 bg-canvas lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
      <section className="relative hidden overflow-hidden bg-brand-gradient p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        {/* Hoa văn chấm + vòng sáng: chỉ trang trí. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.35)_1px,transparent_0)] [background-size:22px_22px]"
          aria-hidden
        />
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-white/10 blur-3xl" aria-hidden />

        <div className="relative flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
            <BotMessageSquare className="size-5" aria-hidden />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-lg font-semibold tracking-tight">Trợ lý Zalo AI</span>
            <span className="text-sm text-white/85">CRM & chăm sóc khách hàng</span>
          </span>
        </div>

        <div className="relative flex max-w-xl flex-col gap-8">
          <h2 className="text-3xl leading-tight font-semibold text-balance xl:text-4xl">Chăm sóc khách trên Zalo và vận hành cả tiệm, trong một trang.</h2>

          {/* Đoạn chat mẫu: cho người mới hình dung bot làm gì. */}
          <figure className="flex max-w-md flex-col gap-2.5 rounded-2xl bg-white/12 p-4 ring-1 ring-white/20 backdrop-blur-sm" aria-label="Ví dụ bot trả lời khách">
            <p className="w-fit max-w-[85%] self-end rounded-2xl rounded-br-md bg-white px-3.5 py-2 text-sm text-foreground shadow-sm">
              Gói cổ vai gáy 60 phút giá bao nhiêu em?
            </p>
            <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-white/20 px-3.5 py-2 text-sm text-white">
              Dạ 550.000đ một lượt ạ. Chị muốn đặt giờ nào để em giữ chỗ cho mình nhé?
            </p>
            <figcaption className="flex items-center gap-1.5 text-xs text-white/85">
              <Bot className="size-3.5" aria-hidden />
              Bot trả lời sau 3 giây, theo bảng giá doanh nghiệp đã nạp
            </figcaption>
          </figure>

          <ul className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            {points.map((p) => (
              <li key={p.title} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/20">
                  <p.icon className="size-[18px]" aria-hidden />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{p.title}</span>
                  <span className="text-sm leading-snug text-white/85">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-sm text-white/85">
          <ShieldCheck className="size-4" aria-hidden />
          Dữ liệu khách được mã hóa, tách riêng từng doanh nghiệp.
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <LoginForm next={safeRedirectPath(next)} />
      </section>
    </main>
  );
}
