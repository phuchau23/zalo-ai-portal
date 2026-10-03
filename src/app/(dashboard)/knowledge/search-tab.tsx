"use client";

import { useState, type FormEvent } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { call } from "@/lib/api/call";
import { api, type KnowledgeSearchResult } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";

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
    <div className="flex flex-col gap-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Gõ câu hỏi như khách hỏi, ví dụ: giá massage 60 phút"
          maxLength={500}
          aria-label="Câu hỏi thử"
        />
        <Button type="submit" disabled={searching || !query.trim()}>
          {searching ? "Đang tìm..." : "Tìm"}
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        {examples.map((e) => (
          <Button key={e} variant="outline" size="sm" onClick={() => void search(e)}>
            {e}
          </Button>
        ))}
      </div>

      {problem && (
        <Alert variant="destructive">
          <AlertDescription>{problemMessage(problem)}</AlertDescription>
        </Alert>
      )}

      {results && results.length === 0 && (
        <p className="text-muted-foreground">Không tìm thấy đoạn nào. Kho kiến thức còn trống hoặc đang được chuẩn bị.</p>
      )}

      {results?.map((r, i) => (
        <Card key={`${r.knowledgeItemId ?? r.documentId}-${i}`}>
          <CardHeader className="gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={i === 0 ? "default" : "secondary"}>{Math.round(r.score * 100)}% giống</Badge>
              <Badge variant="outline">{r.source === "item" ? "Dữ liệu" : "Tài liệu tham khảo"}</Badge>
              {r.code && <span className="font-mono text-xs text-muted-foreground">{r.code}</span>}
            </div>
            <CardTitle className="text-base">{r.title ?? "(không có tiêu đề)"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="line-clamp-6 whitespace-pre-wrap text-sm text-muted-foreground">{r.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
