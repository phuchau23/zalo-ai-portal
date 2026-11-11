"use client";

import {
  BookOpenCheck,
  CircleCheck,
  CircleDashed,
  Cpu,
  Database,
  EyeOff,
  Gauge,
  Lock,
  MousePointerClick,
  SearchX,
  ShieldAlert,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { IconTile, type Tone as TileTone } from "@/components/common/icon-tile";
import { EmptyState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import type { ChatTrace } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { confidenceLabel, guardLabel, handoffReasonLabel, leadFieldLabel, sentimentLabel, type Tone } from "./labels";

/** Màu ô biểu tượng theo mức độ của lớp an toàn. */
const guardTiles: Record<Tone, TileTone> = {
  destructive: "destructive",
  warning: "warning",
  info: "primary",
  success: "success",
  default: "primary",
  secondary: "muted",
};

/** Độ chắc chắn → số vạch sáng trên thanh 3 vạch. */
const confidenceLevel: Record<string, number> = { high: 3, medium: 2 };

/** Giải thích một câu trả lời của bot: dữ liệu đã đọc, lớp an toàn đã can thiệp, thông tin thu thập. Không chứa nội dung tin của khách. */
export function TracePanel({ trace, medicalSafety }: { trace: ChatTrace | null; medicalSafety: boolean }) {
  if (!trace) {
    return (
      <EmptyState
        icon={MousePointerClick}
        tone="ai"
        title="Chọn một câu trả lời của bot"
        description='Bấm "Vì sao trả lời vậy?" dưới tin của bot để xem bot đã đọc dữ liệu nào và các lớp an toàn đã làm gì.'
        compact
      />
    );
  }

  const confidence = confidenceLabel(trace.confidence);
  const level = confidenceLevel[trace.confidence] ?? 1;
  const usedCount = trace.chunks.filter((c) => c.used).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3 rounded-xl border border-ai/15 bg-ai-soft/60 p-3">
        <IconTile icon={Gauge} tone="ai" size="sm" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted-foreground">Độ chắc chắn</span>
            <Badge variant={confidence.tone}>{confidence.label}</Badge>
          </div>
          <div className="flex gap-1" aria-hidden>
            {[1, 2, 3].map((step) => (
              <span
                key={step}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  step <= level ? (level === 3 ? "bg-success" : level === 2 ? "bg-info" : "bg-warning") : "bg-foreground/10",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2">
        <Stat label="Chuyển nhân viên">
          {trace.needsHuman ? (
            <Badge variant={trace.urgency === "urgent" ? "destructive" : "warning"}>{trace.urgency === "urgent" ? "Khẩn cấp" : "Có"}</Badge>
          ) : (
            <Badge variant="secondary">Không</Badge>
          )}
        </Stat>
        <Stat label="Cảm xúc khách">
          <span className="text-sm font-medium">{sentimentLabel(trace.sentiment)}</span>
        </Stat>
        {trace.needsHuman && trace.handoffReason && (
          <Stat label="Lý do chuyển" wide>
            <span className="text-sm font-medium">{handoffReasonLabel(trace.handoffReason)}</span>
          </Stat>
        )}
        <Stat label="Chủ đề sức khỏe" wide={!(trace.needsHuman && trace.handoffReason)}>
          <span className="text-sm font-medium">{trace.healthTopic ? "Có" : "Không"}</span>
        </Stat>
      </dl>

      <Section icon={Database} title="Dữ liệu bot đã đọc" hint={trace.chunks.length ? `Dùng ${usedCount}/${trace.chunks.length} đoạn` : undefined}>
        {trace.chunks.length === 0 ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
            <SearchX className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              {trace.dangerSignal
                ? "Không cần tra cứu: tin có dấu hiệu nguy hiểm nên bot chuyển nhân viên ngay."
                : "Không tìm thấy dữ liệu liên quan trong kho kiến thức. Nếu khách hay hỏi câu này, hãy bổ sung vào kho."}
              {trace.belowThreshold > 0 && ` (${trace.belowThreshold} đoạn bị bỏ vì quá ít liên quan.)`}
            </p>
          </div>
        ) : (
          <ol className="flex flex-col gap-2">
            {trace.chunks.map((c) => {
              const percent = Math.round(c.score * 100);
              return (
                <li
                  key={c.id}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border p-3 transition-colors",
                    c.used ? "border-ai/30 bg-ai-soft/50" : "bg-background",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {c.used ? (
                      <CircleCheck className="size-4 shrink-0 text-ai" aria-label="Đã dùng" />
                    ) : (
                      <CircleDashed className="size-4 shrink-0 text-muted-foreground" aria-label="Không dùng" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.title ?? "(không có tiêu đề)"}</span>
                    <span className={cn("tabular text-xs font-semibold", c.used ? "text-ai" : "text-muted-foreground")}>{percent}%</span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-foreground/[0.07]" aria-hidden>
                    <div
                      className={cn("h-full rounded-full", c.used ? "bg-primary" : "bg-muted-foreground/40")}
                      style={{ width: `${Math.min(100, percent)}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {c.code && <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{c.code}</span>}
                    <Badge variant="outline">{c.source === "item" ? "Dữ liệu" : "Tài liệu"}</Badge>
                    {medicalSafety &&
                      (c.medicallyReviewed ? (
                        <Badge variant="success">
                          <BookOpenCheck aria-hidden />
                          Đã duyệt chuyên môn
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Chưa duyệt chuyên môn</Badge>
                      ))}
                  </div>
                  <p className="line-clamp-3 text-xs whitespace-pre-wrap text-muted-foreground">{c.excerpt}</p>
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      <Section icon={ShieldCheck} title="Lớp an toàn">
        {trace.guards.length === 0 ? (
          <p className="flex items-center gap-2.5 rounded-xl bg-success/[0.07] px-3 py-2.5 text-sm">
            <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden />
            Không có lớp nào phải can thiệp.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {trace.guards.map((g, i) => {
              const guard = guardLabel(g, trace.forbidden);
              return (
                <li key={`${g}-${i}`} className="flex items-start gap-2.5 rounded-xl border bg-background p-2.5 text-sm">
                  <IconTile icon={guard.tone === "destructive" ? ShieldAlert : ShieldCheck} tone={guardTiles[guard.tone]} size="sm" />
                  <span className="pt-1 text-pretty">{guard.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section icon={Lock} title="Bảo vệ dữ liệu khách">
        <ul className="flex flex-col gap-2 text-sm">
          <ProtectionItem icon={EyeOff}>
            {trace.piiMasked > 0
              ? `Đã che ${trace.piiMasked} thông tin cá nhân (SĐT, email, giấy tờ, tên) trước khi gửi cho AI.`
              : "Không có thông tin cá nhân cần che trong hội thoại."}
          </ProtectionItem>
          {trace.leadKeys.length > 0 && (
            <ProtectionItem icon={UserRound}>Đã lưu (mã hóa) thông tin khách: {trace.leadKeys.map(leadFieldLabel).join(", ")}.</ProtectionItem>
          )}
          {trace.firstReply && <ProtectionItem icon={ShieldCheck}>Tin đầu tiên: đã kèm câu báo trợ lý AI và link chính sách bảo mật (bắt buộc).</ProtectionItem>}
        </ul>
      </Section>

      <p className="tabular flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <Cpu className="size-3.5 shrink-0" aria-hidden />
        {trace.model ? `Model ${trace.model} · ${trace.calls} lần gọi · ${(trace.latencyMs / 1000).toFixed(1)} giây` : "Không gọi AI"} · Mẫu ngành{" "}
        {trace.template}
      </p>
    </div>
  );
}

function Stat({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1.5 rounded-xl bg-muted/50 px-3 py-2.5", wide && "col-span-2")}>
      <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Section({ icon: Icon, title, hint, children }: { icon: LucideIcon; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-ai" aria-hidden />
          {title}
        </h3>
        {hint && <span className="tabular rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function ProtectionItem({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary" aria-hidden>
        <Icon className="size-3" />
      </span>
      <span className="text-pretty">{children}</span>
    </li>
  );
}
