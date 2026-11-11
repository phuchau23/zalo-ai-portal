import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { safeRedirectPath } from "@/lib/safe-redirect";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Đăng nhập — Remi" };

/** Bốn việc Remi làm cho tiệm — liệt kê thẳng, không ô biểu tượng (design.md § Cấm). */
const points: { title: string; text: string }[] = [
  { title: "Trả lời khách trên Zalo", text: "Đúng bảng giá, dịch vụ của tiệm. Câu khó thì chuyển nhân viên." },
  { title: "Giữ lịch, nhắc lịch", text: "Kiểm tra chỗ trống, nhắc khách trước giờ hẹn, hỏi thăm sau buổi làm." },
  { title: "Thu ngân và gói liệu trình", text: "Hóa đơn, mã QR chuyển khoản, gói trừ buổi, kho, hoa hồng." },
  { title: "Số liệu mỗi ngày", text: "Doanh thu, khách quay lại, và trợ lý mang về bao nhiêu." },
];

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;

  return (
    <main className="grid flex-1 bg-canvas lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
      {/* Khối thương hiệu: nền mực phẳng, chữ giấy — không dải màu, không hoa văn (design.md). */}
      <section className="hidden bg-foreground p-10 text-background lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="flex items-center gap-2.5">
          <LogoMark size={32} />
          <span className="font-display text-[22px] leading-none font-bold tracking-[-0.03em]">remi</span>
        </div>

        <div className="flex max-w-xl flex-col gap-10">
          <div className="flex flex-col gap-4">
            <h2 className="text-[44px] leading-[1.08] font-semibold text-balance xl:text-[60px]">
              Giữ khách như <span className="rounded-lg bg-lime box-decoration-clone px-2 text-lime-foreground">người quen.</span>
            </h2>
            <p className="max-w-md text-[15px] leading-relaxed text-background/70">
              Sổ khách, lịch hẹn, thu ngân và một trợ lý trả lời Zalo — cho tiệm spa, phòng khám, tiệm sửa chữa.
            </p>
          </div>

          {/* Đoạn chat mẫu: cho người mới hình dung trợ lý làm gì. */}
          <figure className="flex max-w-sm flex-col gap-2" aria-label="Ví dụ trợ lý trả lời khách">
            <p className="w-fit max-w-[85%] self-end rounded-2xl rounded-br-sm bg-background px-3.5 py-2 text-sm text-foreground">Gói cổ vai gáy 60 phút giá bao nhiêu em?</p>
            <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-background/12 px-3.5 py-2 text-sm">
              Dạ 550.000đ một lượt ạ. Chị muốn đặt giờ nào để em giữ chỗ cho mình nhé?
            </p>
            <figcaption className="text-xs text-background/55">Trợ lý trả lời theo bảng giá tiệm đã nạp.</figcaption>
          </figure>

          <dl className="grid gap-x-8 gap-y-5 border-t border-background/15 pt-6 sm:grid-cols-2">
            {points.map((p) => (
              <div key={p.title} className="flex flex-col gap-1">
                <dt className="text-sm font-semibold">{p.title}</dt>
                <dd className="text-sm leading-snug text-background/65">{p.text}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="flex items-center gap-2 text-sm text-background/60">
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
