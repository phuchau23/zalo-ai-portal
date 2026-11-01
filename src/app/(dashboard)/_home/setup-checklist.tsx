"use client";

import Link from "next/link";
import { ArrowRight, Check, Rocket } from "lucide-react";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { setupProgress, type SetupStep } from "@/lib/home";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";

/**
 * Các bước thiết lập theo thứ tự nên làm, tự đánh dấu đã xong từ dữ liệu thật. Xong hết thì ẩn (không chiếm chỗ trang chủ).
 * Mỗi bước gọi API đọc riêng; lỗi một API thì coi bước đó chưa xong (không chặn cả thẻ).
 */
export function SetupChecklist() {
  const { data } = useApiData(async () => {
    const [settings, catalog, knowledge, staff, chats, telegram, channels] = await Promise.all([
      call(() => api.GET("/tenant/settings")),
      call(() => api.GET("/catalog", { params: { query: { kind: "service", includeInactive: false } } })),
      call(() => api.GET("/knowledge/status")),
      call(() => api.GET("/staff", { params: { query: { includeInactive: false } } })),
      call(() => api.GET("/chat-test/conversations")),
      call(() => api.GET("/tenant/handoff-settings")),
      call(() => api.GET("/channels")),
    ]);
    const steps: SetupStep[] = [
      {
        key: "business",
        title: "Thông tin doanh nghiệp",
        description: "Tên, ngành và link chính sách bảo mật (bắt buộc theo luật).",
        href: "/settings",
        done: settings.ok && Boolean(settings.data.privacyUrl),
      },
      {
        key: "catalog",
        title: "Dịch vụ & bảng giá",
        description: "Danh mục dịch vụ, gói liệu trình để đặt lịch và bán hàng.",
        href: "/catalog",
        done: catalog.ok && catalog.data.length > 0,
      },
      {
        key: "knowledge",
        title: "Kho kiến thức cho bot",
        description: "Câu hỏi thường gặp, chính sách, tài liệu để bot trả lời đúng.",
        href: "/knowledge",
        done: knowledge.ok && knowledge.data.items + knowledge.data.documents > 0,
      },
      {
        key: "chat",
        title: "Chat thử với bot",
        description: "Đóng vai khách, xem bot trả lời có đúng ý bạn không.",
        href: "/chat-test",
        done: chats.ok && chats.data.length > 0,
      },
      {
        key: "staff",
        title: "Nhân viên & ca làm",
        description: "Ai làm dịch vụ nào, ca mấy giờ, để bot xếp lịch đúng người.",
        href: "/staff",
        done: staff.ok && staff.data.length > 0,
      },
      {
        key: "telegram",
        title: "Nhóm Telegram nhận thông báo",
        description: "Báo ngay khi khách cần người thật hoặc chờ quá lâu.",
        href: "/settings/notifications",
        done: telegram.ok && Boolean(telegram.data.telegramChatId),
      },
      {
        key: "zalo",
        title: "Kết nối Zalo OA",
        description: "Bước cuối: bot bắt đầu trả lời khách thật 24/7.",
        href: "/channels",
        done: channels.ok && channels.data.connections.some((c) => c.status === "active"),
      },
    ];
    return { ok: true as const, data: steps };
  });

  if (!data) return null;
  const { done, total, next } = setupProgress(data);
  if (!next) return null;

  return (
    <section aria-labelledby="setup" className="surface flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground" aria-hidden>
            <Rocket className="size-5" />
          </span>
          <div className="flex flex-col gap-0.5">
            <h2 id="setup" className="text-base font-semibold">
              Thiết lập hệ thống
            </h2>
            <p className="text-sm text-muted-foreground">
              Đã xong {done}/{total} bước. Làm tiếp: <span className="font-medium text-foreground">{next.title}</span>.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:w-56">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Tiến độ thiết lập" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
            <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(done / total) * 100}%` }} />
          </div>
          <span className="tabular text-sm font-medium text-muted-foreground">{Math.round((done / total) * 100)}%</span>
        </div>
      </div>
      <ol className="grid gap-2 md:grid-cols-2">
        {data.map((step, index) => {
          const isNext = step === next;
          return (
            <li key={step.key}>
              <Link
                href={step.href}
                className={cn(
                  "group flex h-full items-start gap-3 rounded-xl border p-3 transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  isNext ? "border-primary/40 bg-accent/60 hover:bg-accent" : "hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "tabular mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    step.done ? "bg-success text-white" : isNext ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {step.done ? <Check className="size-3.5" /> : index + 1}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={cn("text-sm font-medium", step.done && "text-muted-foreground line-through decoration-muted-foreground/40")}>
                    {step.title}
                    <span className="sr-only">{step.done ? " (đã xong)" : " (chưa xong)"}</span>
                  </span>
                  <span className="text-xs leading-snug text-muted-foreground">{step.description}</span>
                </span>
                {!step.done && (
                  <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
