"use client";

import { useState, type FormEvent } from "react";
import { CircleAlert, LoaderCircle, Search, SearchX } from "lucide-react";
import { EmptyState } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { call } from "@/lib/api/call";
import { api, type KnowledgeSearchResult } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { cn } from "@/lib/utils";

const examples = ["giá massage đông y 60 phút", "chi nhánh Thủ Đức ở đâu", "đang cho con bú massage được không", "mấy giờ đóng cửa"];

/** Gõ câu hỏi như khách hỏi → xem bot sẽ tìm thấy đoạn dữ liệu nào (bot dùng các đoạn này để trả lời ở M3). */
export function SearchTab() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeSearchResult[] | null>(null);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const [searching, setSearching] = useState(false);

  async function search(text: string) {
    if (!text.trim()) return;
    setQuery(text);
    setSearching(true);
    setProblem(null);
    const result = await call(() => api.POST("/knowledge/search", { body: { query: text, limit: 5 } }));
    setSearching(false);
    if (result.ok) {
      setResults(result.data);
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
      <div className="flex flex-col gap-3">
        <p className="max-w-3xl text-sm text-muted-foreground">
          Gõ câu hỏi như khách sẽ hỏi để xem bot tìm thấy đoạn dữ liệu nào. Nếu kết quả đầu tiên không đúng, hãy bổ sung hoặc sửa dữ liệu.
        </p>
        <form onSubmit={onSubmit} role="search" className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ví dụ: giá massage 60 phút"
              maxLength={500}
              aria-label="Câu hỏi thử"
              className="h-10 pl-9"
            />
          </div>
          <Button type="submit" size="lg" disabled={searching || !query.trim()}>
            {searching && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
            {searching ? "Đang tìm..." : "Tìm"}
          </Button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Thử nhanh:</span>
          {examples.map((e) => (
            <Button key={e} variant="outline" size="sm" className="font-normal" onClick={() => void search(e)} disabled={searching}>
              {e}
            </Button>
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
        <ol className="divide-y rounded-md border" aria-label="Kết quả bot tìm thấy">
          {results.map((r, i) => {
            const percent = Math.round(r.score * 100);
            return (
              <li key={`${r.knowledgeItemId ?? r.documentId}-${i}`} className={cn("flex gap-4 px-4 py-4", i === 0 && "bg-accent/40")}>
                <span
                  className={cn(
                    "tabular flex size-7 shrink-0 items-center justify-center rounded-md text-sm font-semibold",
                    i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                  aria-label={`Hạng ${i + 1}`}
                >
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-medium">{r.title ?? "(không có tiêu đề)"}</span>
                    <Badge variant="outline">{r.source === "item" ? "Dữ liệu" : "Tài liệu tham khảo"}</Badge>
                    {r.code && <span className="font-mono text-xs text-muted-foreground">{r.code}</span>}
                  </div>
                  <p className="line-clamp-4 text-sm whitespace-pre-wrap text-muted-foreground">{r.content}</p>
                </div>
                <div className="hidden w-28 shrink-0 flex-col items-end gap-1.5 sm:flex">
                  <span className="tabular text-sm font-semibold">{percent}%</span>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className={cn("h-full", i === 0 ? "bg-primary" : "bg-primary/50")} style={{ width: `${percent}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground">độ khớp</span>
                </div>
                <span className="tabular shrink-0 text-sm font-semibold sm:hidden">{percent}%</span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
