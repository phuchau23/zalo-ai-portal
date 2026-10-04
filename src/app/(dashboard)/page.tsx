"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleCheck, CircleDashed, Database, FileText, Inbox, MessagesSquare, Plug, type LucideIcon } from "lucide-react";
import { PageHeader, SectionHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";

type Step = { title: string; description: string; icon: LucideIcon; href?: string; module?: string };

const steps: Step[] = [
  {
    title: "Kho kiến thức",
    description: "Nạp bảng giá, dịch vụ, câu hỏi thường gặp, tài liệu để bot trả lời đúng dữ liệu của bạn.",
    icon: Database,
    href: "/knowledge",
  },
  { title: "Chat thử", description: "Tự chat với bot và chỉnh giọng văn trước khi bật cho khách.", icon: MessagesSquare, href: "/chat-test" },
  { title: "Kết nối Zalo OA", description: "Kết nối Official Account để bot trả lời khách 24/7.", icon: Plug, href: "/channels" },
  { title: "Hộp thư", description: "Xem hội thoại, tiếp quản khi khách cần người thật.", icon: Inbox, module: "M5" },
];

export default function OverviewPage() {
  const { me } = useSession();
  const router = useRouter();
  const isStaff = me.currentTenant?.role === "staff";
  const { data: status } = useApiData(() => call(() => api.GET("/knowledge/status")));
  const { data: waiting } = useApiData(() =>
    call(() => api.GET("/inbox/conversations", { params: { query: { filter: "attention", includeTest: false } } })),
  );

  // Nhân viên trực: vào thẳng Hộp thư.
  useEffect(() => {
    if (isStaff) router.replace("/inbox");
  }, [isStaff, router]);
  const knowledgeReady = Boolean(status && status.items + status.documents > 0);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={`Xin chào, ${me.name}`} description={me.currentTenant?.name} />

      <div className="grid grid-cols-2 overflow-hidden rounded-md border lg:grid-cols-4">
        <Stat label="Mục dữ liệu" value={status?.items} icon={Database} href="/knowledge" />
        <Stat label="Tài liệu tham khảo" value={status?.documents} icon={FileText} href="/knowledge?tab=documents" />
        <Stat label="Khách đang chờ nhân viên" value={waiting?.length} icon={Inbox} href="/inbox" />
        <Stat label="Zalo OA" hint="Xem kết nối" icon={Plug} href="/channels" />
      </div>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Các bước thiết lập" description="Làm lần lượt để bot sẵn sàng trả lời khách." />
        <ol className="divide-y rounded-md border">
          {steps.map((step, index) => {
            const done = index === 0 && knowledgeReady;
            const Icon = step.icon;
            const body = (
              <>
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold",
                    done ? "bg-success/10 text-success" : step.href ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {done ? <CircleCheck className="size-4" /> : index + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    <Icon className="size-4 text-muted-foreground" aria-hidden />
                    {step.title}
                    {done && <Badge variant="success">Đã có dữ liệu</Badge>}
                    {step.module && (
                      <Badge variant="secondary">
                        <CircleDashed aria-hidden />
                        Sắp có
                      </Badge>
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground">{step.description}</span>
                </div>
                {step.href && <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />}
              </>
            );
            return (
              <li key={step.title}>
                {step.href ? (
                  <Link
                    href={step.href}
                    className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-center gap-4 px-4 py-4">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

function Stat({ label, value, hint, icon: Icon, href }: { label: string; value?: number; hint?: string; icon: LucideIcon; href?: string }) {
  const content = (
    <>
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </p>
      <p className="tabular text-2xl font-semibold tracking-tight">
        {value !== undefined ? value.toLocaleString("vi-VN") : <span className="text-base font-normal text-muted-foreground">{hint ?? "—"}</span>}
      </p>
    </>
  );
  const className = "flex flex-col gap-1.5 border-b border-l -ml-px -mb-px p-4";
  return href ? (
    <Link href={href} className={cn(className, "transition-colors hover:bg-accent/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset")}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
