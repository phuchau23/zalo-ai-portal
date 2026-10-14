"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleAlert, CircleCheck, Phone } from "lucide-react";
import { SectionHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { formatDay, noteKindLabel } from "@/lib/customers";
import { formatDateTime } from "@/lib/format";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";

/**
 * Lịch hẹn đã tới giờ của khách CHỈ CÓ SĐT (nhập từ danh sách, chưa từng nhắn Zalo OA → bot chưa nhắn được): liệt kê để nhân viên
 * gọi điện / nhắn Zalo cá nhân, rồi bấm "Đã liên hệ". Không gọi AI. Không có ai tới hẹn thì không hiện gì.
 */
export function PhoneDueSection() {
  const { data, reload } = useApiData(() => call(() => api.GET("/care/phone-due")));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [problem, setProblem] = useState<ApiProblem | null>(null);

  if (!data || data.length === 0) return null;

  async function done(noteId: string) {
    setBusyId(noteId);
    setProblem(null);
    const result = await call(() => api.POST("/care/phone-due/{noteId}/done", { params: { path: { noteId } } }));
    setBusyId(null);
    if (!result.ok) setProblem(result.problem);
    reload();
  }

  return (
    <section aria-labelledby="phone-due" className="flex flex-col gap-3">
      <SectionHeader
        title={
          <span id="phone-due" className="flex items-center gap-2">
            Tới hẹn – chưa nhắn OA được <Badge variant="warning">{data.length}</Badge>
          </span>
        }
        description="Khách trong danh sách bạn nhập, chưa từng nhắn Zalo OA nên bot chưa nhắn được. Gọi điện hoặc nhắn Zalo cá nhân, rồi bấm Đã liên hệ."
      />
      {problem && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(problem)}
        </p>
      )}
      <ul className="flex flex-col divide-y rounded-md border">
        {data.map((d) => (
          <li key={d.noteId} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2 font-medium">
                {d.name}
                <span className="text-sm font-normal text-muted-foreground">(gọi &quot;{d.salutation}&quot;)</span>
                {d.consentMarketing && <Badge variant="secondary">Nhận tin ưu đãi</Badge>}
              </span>
              <p className="text-sm break-words">
                <span className="text-muted-foreground">
                  {noteKindLabel(d.kind)} {formatDay(d.happenedOn)}:
                </span>{" "}
                {d.note}
              </p>
              <p className="text-xs text-muted-foreground">Hẹn chăm sóc lúc {formatDateTime(d.followUpAt)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {d.phone && (
                <a href={`tel:${d.phone}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "tabular h-11 sm:h-8")}>
                  <Phone aria-hidden />
                  {d.phone}
                </a>
              )}
              <Link href={`/customers/${d.contactId}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-11 sm:h-8")}>
                Hồ sơ
              </Link>
              <Button size="sm" className="h-11 sm:h-8" disabled={busyId === d.noteId} onClick={() => void done(d.noteId)}>
                <CircleCheck aria-hidden />
                Đã liên hệ
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
