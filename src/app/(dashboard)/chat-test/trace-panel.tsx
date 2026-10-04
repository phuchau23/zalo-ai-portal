"use client";

import { BookOpenCheck, CircleCheck, CircleDashed, EyeOff, MousePointerClick, ShieldAlert, ShieldCheck, SearchX, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import type { ChatTrace } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { confidenceLabel, guardLabel, handoffReasonLabel, leadFieldLabel, sentimentLabel } from "./labels";

/** Giải thích một câu trả lời của bot: dữ liệu đã đọc, lớp an toàn đã can thiệp, thông tin thu thập. Không chứa nội dung tin của khách. */
export function TracePanel({ trace, medicalSafety }: { trace: ChatTrace | null; medicalSafety: boolean }) {
  if (!trace) {
    return (
      <EmptyState
        icon={MousePointerClick}
        title="Chọn một câu trả lời của bot"
        description='Bấm "Vì sao trả lời vậy?" dưới tin của bot để xem bot đã đọc dữ liệu nào và các lớp an toàn đã làm gì.'
        className="border-0 py-10"
      />
    );
  }

  const confidence = confidenceLabel(trace.confidence);
  const usedCount = trace.chunks.filter((c) => c.used).length;

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-3">
        <Stat label="Độ chắc chắn">
          <Badge variant={confidence.tone}>{confidence.label}</Badge>
        </Stat>
        <Stat label="Chuyển nhân viên">
          {trace.needsHuman ? (
            <Badge variant={trace.urgency === "urgent" ? "destructive" : "warning"}>{trace.urgency === "urgent" ? "Khẩn cấp" : "Có"}</Badge>
          ) : (
            <Badge variant="secondary">Không</Badge>
          )}
        </Stat>
        {trace.needsHuman && trace.handoffReason && (
          <Stat label="Lý do chuyển" wide>
            <span className="text-sm">{handoffReasonLabel(trace.handoffReason)}</span>
          </Stat>
        )}
        <Stat label="Cảm xúc khách">
          <span className="text-sm">{sentimentLabel(trace.sentiment)}</span>
        </Stat>
        <Stat label="Chủ đề sức khỏe">
          <span className="text-sm">{trace.healthTopic ? "Có" : "Không"}</span>
        </Stat>
      </dl>

      <Section
        title="Dữ liệu bot đã đọc"
        hint={trace.chunks.length ? `Dùng ${usedCount}/${trace.chunks.length} đoạn để trả lời` : undefined}
      >
        {trace.chunks.length === 0 ? (
          <div className="flex items-start gap-2.5 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
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
            {trace.chunks.map((c) => (
              <li key={c.id} className={cn("flex flex-col gap-1.5 rounded-md border p-3", c.used ? "border-primary/40 bg-accent/40" : "bg-background")}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {c.used ? (
                    <CircleCheck className="size-4 shrink-0 text-primary" aria-label="Đã dùng" />
                  ) : (
                    <CircleDashed className="size-4 shrink-0 text-muted-foreground" aria-label="Không dùng" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.title ?? "(không có tiêu đề)"}</span>
                  <span className="tabular text-xs font-semibold text-muted-foreground">{Math.round(c.score * 100)}%</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {c.code && <span className="font-mono text-xs text-muted-foreground">{c.code}</span>}
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
            ))}
          </ol>
        )}
      </Section>

      <Section title="Lớp an toàn">
        {trace.guards.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden />
            Không có lớp nào phải can thiệp.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {trace.guards.map((g, i) => {
              const guard = guardLabel(g, trace.forbidden);
              const danger = guard.tone === "destructive";
              return (
                <li key={`${g}-${i}`} className="flex items-start gap-2 text-sm">
                  {danger ? (
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                  ) : (
                    <ShieldCheck className={cn("mt-0.5 size-4 shrink-0", guard.tone === "warning" ? "text-warning" : "text-primary")} aria-hidden />
                  )}
                  <span>{guard.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <Section title="Bảo vệ dữ liệu khách">
        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex items-start gap-2">
            <EyeOff className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              {trace.piiMasked > 0
                ? `Đã che ${trace.piiMasked} thông tin cá nhân (SĐT, email, giấy tờ, tên) trước khi gửi cho AI.`
                : "Không có thông tin cá nhân cần che trong hội thoại."}
            </span>
          </li>
          {trace.leadKeys.length > 0 && (
            <li className="flex items-start gap-2">
              <UserRound className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>Đã lưu (mã hóa) thông tin khách: {trace.leadKeys.map(leadFieldLabel).join(", ")}.</span>
            </li>
          )}
          {trace.firstReply && (
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>Tin đầu tiên: đã kèm câu báo trợ lý AI và link chính sách bảo mật (bắt buộc).</span>
            </li>
          )}
        </ul>
      </Section>

      <p className="tabular border-t pt-3 text-xs text-muted-foreground">
        {trace.model ? `Model ${trace.model} · ${trace.calls} lần gọi · ${(trace.latencyMs / 1000).toFixed(1)} giây` : "Không gọi AI"} · Mẫu ngành{" "}
        {trace.template}
      </p>
    </div>
  );
}

function Stat({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={cn("flex flex-col gap-1 rounded-md border bg-background p-3", wide && "col-span-2")}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}
