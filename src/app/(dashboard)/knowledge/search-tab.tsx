"use client";

import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { CircleAlert, LoaderCircle, Search, SearchX, Sparkles, Trophy } from "lucide-react";
import { IconTile } from "@/components/common/icon-tile";
import { EmptyState } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { call } from "@/lib/api/call";
import { api, type KnowledgeSearchResult } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { easeOut, fadeUp, stagger } from "@/lib/motion";
import { cn } from "@/lib/utils";

const examples = ["giá massage đông y 60 phút", "chi nhánh Thủ Đức ở đâu", "đang cho con bú massage được không", "mấy giờ đóng cửa"];

/** Gõ câu hỏi như khách hỏi → xem bot sẽ tìm thấy đoạn dữ liệu nào (bot dùng các đoạn này để trả lời ở M3). */
export function SearchTab() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeSearchResult[] | null>(null);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const [searching, setSearching] = useState(false);
  /** Tăng mỗi lần tìm xong để danh sách kết quả hiện lại từ đầu (hiệu ứng lần lượt). */
  const [round, setRound] = useState(0);

  async function search(text: string) {
    if (!text.trim()) return;
    setQuery(text);
    setSearching(true);
    setProblem(null);
    const result = await call(() => api.POST("/knowledge/search", { body: { query: text, limit: 5 } }));
    setSearching(false);
    if (result.ok) {
      setResults(result.data);
      setRound((r) => r + 1);
    } else {
      setProblem(result.problem);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search(query);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="surface relative flex flex-col gap-4 overflow-hidden p-5 md:p-6">
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/3 size-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <IconTile icon={Search} variant="solid" size="md" />
          <div className="flex flex-col gap-0.5">
            <h2 className="font-semibold tracking-tight">Bot sẽ tìm thấy gì?</h2>
            <p className="max-w-3xl text-sm text-pretty text-muted-foreground">
              Gõ câu hỏi như khách sẽ hỏi để xem bot tìm thấy đoạn dữ liệu nào. Nếu kết quả đầu tiên không đúng, hãy bổ sung hoặc sửa dữ liệu.
            </p>
          </div>
        </div>
        <form onSubmit={onSubmit} role="search" className="relative flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ví dụ: giá massage 60 phút"
              maxLength={500}
              aria-label="Câu hỏi thử"
              className="h-11 rounded-xl pl-10 text-[15px]"
            />
          </div>
          <Button type="submit" size="lg" className="h-11 rounded-xl px-5" disabled={searching || !query.trim()}>
            {searching ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Sparkles aria-hidden />}
            {searching ? "Đang tìm..." : "Tìm"}
          </Button>
        </form>
        <div className="relative flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Thử nhanh:</span>
          {examples.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => void search(e)}
              disabled={searching}
              className="min-h-8 cursor-pointer rounded-full border bg-background px-3 text-[13px] transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 pointer-coarse:min-h-10"
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {problem && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{problemMessage(problem)}</AlertDescription>
        </Alert>
      )}

      {results && results.length === 0 && (
        <EmptyState icon={SearchX} title="Không tìm thấy đoạn nào" description="Kho kiến thức còn trống hoặc đang được chuẩn bị. Thử lại sau ít phút." />
      )}

      {results && results.length > 0 && (
        <motion.ol key={round} variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-3" aria-label="Kết quả bot tìm thấy">
          {results.map((r, i) => {
            const percent = Math.round(r.score * 100);
            const top = i === 0;
            return (
              <motion.li
                key={`${r.knowledgeItemId ?? r.documentId}-${i}`}
                variants={fadeUp}
                className={cn("surface flex gap-4 p-4", top && "border-primary/35 bg-accent/40 ring-1 ring-primary/15")}
              >
                <span
                  className={cn(
                    "tabular flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                    top
                      ? "bg-active-gradient text-white shadow-glow"
                      : "bg-muted text-muted-foreground",
                  )}
                  aria-label={`Hạng ${i + 1}`}
                >
                  {top ? <Trophy className="size-4" aria-hidden /> : i + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-semibold">{r.title ?? "(không có tiêu đề)"}</span>
                    {top && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">Bot dùng trước</span>}
                    <Badge variant="outline">{r.source === "item" ? "Dữ liệu" : "Tài liệu tham khảo"}</Badge>
                    {r.code && <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{r.code}</span>}
                  </div>
                  <p className="line-clamp-4 text-sm whitespace-pre-wrap text-muted-foreground">{r.content}</p>
                  <div className="flex items-center gap-2.5 sm:hidden">
                    <span className={cn("tabular shrink-0 text-xs font-semibold", top ? "text-primary" : "text-foreground")}>{percent}% khớp</span>
                    <Relevance percent={percent} top={top} />
                  </div>
                </div>
                <div className="hidden w-32 shrink-0 flex-col items-end gap-1.5 sm:flex">
                  <span className={cn("tabular text-lg font-bold tracking-tight", top ? "text-primary" : "text-foreground")}>{percent}%</span>
                  <Relevance percent={percent} top={top} />
                  <span className="text-xs text-muted-foreground">độ khớp</span>
                </div>
              </motion.li>
            );
          })}
        </motion.ol>
      )}
    </div>
  );
}

function Relevance({ percent, top }: { percent: number; top: boolean }) {
  return (
    <span className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
      <motion.span
        className={cn("h-full origin-left rounded-full", top ? "bg-active-gradient" : "bg-primary/35")}
        style={{ width: `${Math.min(100, percent)}%` }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.7, ease: easeOut }}
      />
    </span>
  );
}
