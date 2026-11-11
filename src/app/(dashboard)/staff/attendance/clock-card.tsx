"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { LoaderCircle, LogIn, LogOut, Timer } from "lucide-react";
import { PersonAvatar } from "@/components/common/person-avatar";
import { Button } from "@/components/ui/button";
import { call } from "@/lib/api/call";
import { api, type Schemas, type StaffMember } from "@/lib/api/client";
import { problemMessage } from "@/lib/api/problem";
import { defaultTimeZone, formatTime } from "@/lib/appointments";
import { useNow } from "@/lib/use-api-data";
import { clockLabel } from "@/lib/reports";
import { cn } from "@/lib/utils";

type Attendance = Schemas["AttendanceResponse"];
/** Tự chấm cho chính mình: không chỉ định người, chi nhánh mặc định của hồ sơ. */
const none = { staffMemberId: null, branchId: null, note: null };

/**
 * Thẻ chấm công của chính người đang đăng nhập (tài khoản gắn hồ sơ nhân viên): một nút lớn Vào ca / Ra ca,
 * đồng hồ đếm thời gian trong ca chạy từng giây, chấm xanh "đang trong ca". Lỗi (đã vào ca rồi...) hiện ngay dưới nút.
 */
export function ClockCard({ me, open, branchName, onChanged }: { me: StaffMember; open: Attendance | null; branchName: string; onChanged: () => void }) {
  const now = useNow(1000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const elapsed = open ? (now - new Date(open.clockInAt).getTime()) / 1000 : 0;

  async function clock(kind: "in" | "out") {
    setBusy(true);
    setError(null);
    const result = await call(() => (kind === "in" ? api.POST("/attendance/clock-in", { body: none }) : api.POST("/attendance/clock-out", { body: none })));
    setBusy(false);
    if (!result.ok) return setError(problemMessage(result.problem));
    onChanged();
  }

  return (
    <section
      aria-label="Chấm công của bạn"
      className={cn(
        "relative isolate flex flex-col gap-5 overflow-hidden rounded-2xl border p-5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-6",
        open ? "border-success/25 bg-success/[0.04]" : "bg-card",
      )}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <PersonAvatar name={me.displayName} size="lg" />
          {open && (
            <span className="absolute -right-0.5 -bottom-0.5 flex size-4" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping-soft rounded-full bg-success motion-reduce:animate-none" />
              <span className="relative inline-flex size-4 rounded-full border-2 border-card bg-success" />
            </span>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-sm text-muted-foreground">{open ? "Bạn đang trong ca" : "Bạn chưa vào ca"}</p>
          <p className="text-lg font-semibold tracking-tight">{me.displayName}</p>
          <p className="text-xs text-muted-foreground">
            {open ? `Vào lúc ${formatTime(open.clockInAt, defaultTimeZone)} · ${branchName}` : branchName}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-2 sm:items-end">
        <div className="flex items-center gap-4">
          {open && (
            <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 font-mono text-3xl font-semibold tracking-tight text-success tabular-nums" aria-label="Thời gian trong ca">
              <Timer className="size-5" aria-hidden />
              {clockLabel(elapsed)}
            </motion.span>
          )}
          <Button
            size="lg"
            onClick={() => void clock(open ? "out" : "in")}
            disabled={busy}
            variant={open ? "outline" : "default"}
            className={cn("h-12 min-w-36 flex-1 rounded-xl text-base sm:flex-none", open && "border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive")}
          >
            {busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : open ? <LogOut aria-hidden /> : <LogIn aria-hidden />}
            {open ? "Ra ca" : "Vào ca"}
          </Button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
