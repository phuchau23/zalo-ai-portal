"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Bot, CircleAlert, CornerDownLeft, Loader2, RotateCcw } from "lucide-react";
import { IconTile } from "@/components/common/icon-tile";
import { Button } from "@/components/ui/button";
import { call } from "@/lib/api/call";
import { api, type Schemas } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { fadeUp } from "@/lib/motion";
import { isDay, rangeLabel, type DateRange } from "@/lib/reports";
import { cn } from "@/lib/utils";
import { reportTabs, tabForAnswer, type ReportTab } from "./report-params";

const suggestions = [
  "Doanh thu tháng này so với tháng trước?",
  "Dịch vụ nào bán chạy nhất 30 ngày qua?",
  "Bao nhiêu khách quay lại tháng này?",
  "Giờ nào đông khách nhất tuần qua?",
  "Trợ lý AI mang về bao nhiêu tiền tháng này?",
];

/**
 * "Hỏi số liệu": chủ doanh nghiệp gõ câu hỏi tiếng Việt → BE cho AI chọn báo cáo + khoảng thời gian, HỆ THỐNG tính số,
 * AI chỉ diễn giải (không bịa số). Trả lời hiện ngay dưới ô hỏi kèm nút mở đúng báo cáo với đúng khoảng ngày.
 */
export function AskBar({ onOpen }: { onOpen: (target: ReportTab | "staff", range: DateRange | null) => void }) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Schemas["AskReportResponse"] | null>(null);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    setQuestion(q);
    setBusy(true);
    setProblem(null);
    setAnswer(null);
    const result = await call(() => api.POST("/reports/ask", { body: { question: q } }));
    setBusy(false);
    if (result.ok) setAnswer(result.data);
    else setProblem(result.problem);
  }

  function reset() {
    setAnswer(null);
    setProblem(null);
    setQuestion("");
    inputRef.current?.focus();
  }

  const target = answer ? tabForAnswer(answer.report) : null;
  const range = answer && isDay(answer.from) && isDay(answer.to) ? { from: answer.from, to: answer.to } : null;
  const targetLabel = target === "staff" ? "Hiệu suất nhân viên" : target ? reportTabs.find((t) => t.value === target)?.label : null;

  return (
    <section aria-labelledby="ask-title" className="relative isolate overflow-hidden rounded-2xl border border-ai/20 bg-card shadow-card">

      <form
        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
      >
        <div className="flex items-center gap-3 sm:contents">
          <IconTile icon={Bot} tone="ai" variant="solid" size="md" />
          <div className="flex min-w-0 flex-col sm:hidden">
            <h2 id="ask-title" className="text-sm font-semibold">
              Hỏi số liệu
            </h2>
            <p className="text-xs text-muted-foreground">Gõ câu hỏi như nói chuyện.</p>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border bg-background px-3 transition-shadow focus-within:border-ai/50 focus-within:ring-3 focus-within:ring-ai/20">
          <label htmlFor="ask-input" className="sr-only">
            Hỏi số liệu bằng tiếng Việt
          </label>
          <input
            ref={inputRef}
            id="ask-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={500}
            autoComplete="off"
            enterKeyHint="send"
            placeholder="Hỏi số liệu, ví dụ: doanh thu tháng này theo nhân viên?"
            className="h-12 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground/80"
          />
          <kbd className="hidden items-center gap-1 rounded-md border bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground lg:inline-flex" aria-hidden>
            <CornerDownLeft className="size-3" />
            Enter
          </kbd>
        </div>
        <Button
          type="submit"
          disabled={busy || !question.trim()}
          className="h-12 rounded-lg px-5"
        >
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Bot aria-hidden />}
          {busy ? "Đang tính…" : "Hỏi"}
        </Button>
      </form>

      <div aria-live="polite" className="border-t border-ai/10 empty:hidden">
        <AnimatePresence mode="wait" initial={false}>
          {busy ? (
            <motion.div key="busy" variants={fadeUp} initial="hidden" animate="show" exit={{ opacity: 0 }} className="flex flex-col gap-2 px-5 py-4" role="status">
              <p className="text-xs font-medium text-ai">Đang chọn báo cáo và tính số liệu…</p>
              <div className="skeleton h-3.5 w-11/12" />
              <div className="skeleton h-3.5 w-3/5" />
            </motion.div>
          ) : answer ? (
            <motion.div key="answer" variants={fadeUp} initial="hidden" animate="show" exit={{ opacity: 0 }} className="flex flex-col gap-3 px-5 py-4">
              <p className="text-xs font-medium text-muted-foreground">
                Bạn hỏi: <span className="text-foreground">“{question}”</span>
              </p>
              <p className="text-[15px] leading-relaxed text-pretty whitespace-pre-line">{answer.answer}</p>
              <div className="flex flex-wrap items-center gap-2">
                {target && targetLabel && (
                  <Button size="sm" className="h-10 rounded-full sm:h-8" onClick={() => onOpen(target, range)}>
                    Mở báo cáo {targetLabel}
                    {range && <span className="font-normal opacity-80">· {rangeLabel(range)}</span>}
                    <ArrowRight aria-hidden />
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-10 rounded-full sm:h-8" onClick={reset}>
                  <RotateCcw aria-hidden />
                  Hỏi câu khác
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">Số liệu do hệ thống tính; AI chỉ chọn báo cáo và diễn giải.</p>
            </motion.div>
          ) : problem ? (
            <motion.div key="problem" variants={fadeUp} initial="hidden" animate="show" className="flex items-start gap-2 px-5 py-4 text-sm text-destructive" role="alert">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Chưa trả lời được: {problemMessage(problem)} Bạn có thể xem trực tiếp các tab bên dưới.
              </span>
            </motion.div>
          ) : (
            <motion.div key="hints" initial={false} className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:flex-wrap sm:px-5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void ask(s)}
                  className={cn(
                    "inline-flex min-h-9 shrink-0 cursor-pointer items-center rounded-full border bg-background px-3 text-[13px] text-foreground/80 transition-colors",
                    "hover:border-ai/40 hover:bg-ai-soft hover:text-ai focus-visible:ring-3 focus-visible:ring-ai/30 focus-visible:outline-none",
                  )}
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
