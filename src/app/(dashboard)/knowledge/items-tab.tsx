"use client";

import { Fragment, useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { call } from "@/lib/api/call";
import { api, type KnowledgeItem } from "@/lib/api/client";
import { problemMessage } from "@/lib/api/problem";
import { formatDateTime, formatFieldValue } from "@/lib/format";
import { useApiData } from "@/lib/use-api-data";
import { DownloadButtons } from "./download-buttons";

const kinds = [
  { value: "all", label: "Tất cả loại" },
  { value: "info", label: "Thông tin chung" },
  { value: "service", label: "Dịch vụ" },
  { value: "package", label: "Gói liệu trình" },
  { value: "faq", label: "Câu hỏi thường gặp" },
  { value: "policy", label: "Chính sách" },
];

/** Một dòng tóm tắt: giá + thời lượng cho dịch vụ/gói, câu trả lời / nội dung cho loại khác. */
function summary(item: KnowledgeItem): string {
  const field = (name: string) => item.fields.find((f) => f.field === name);
  const price = field("price");
  const parts: string[] = [];
  if (item.kind === "service" || item.kind === "package") {
    parts.push(price ? formatFieldValue("money", price.value) : "Liên hệ");
    const minutes = field("durationMinutes") ?? field("minutesPerSession");
    const sessions = field("sessions");
    if (sessions) parts.push(`${sessions.value} buổi`);
    if (minutes) parts.push(`${minutes.value} phút${sessions ? "/buổi" : ""}`);
  } else {
    const text = field("answer") ?? field("content");
    if (text) parts.push(text.value.length > 90 ? `${text.value.slice(0, 90)}…` : text.value);
  }

  return parts.join(" · ");
}

export function ItemsTab({ canEdit, onImport }: { canEdit: boolean; onImport: () => void }) {
  const { data, problem, loading } = useApiData(() => call(() => api.GET("/knowledge/items")));
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? []).filter(
      (item) =>
        (kind === "all" || item.kind === kind) &&
        (!q || item.title.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)),
    );
  }, [data, kind, query]);

  if (problem && !data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{problemMessage(problem)}</AlertDescription>
      </Alert>
    );
  }

  if (loading && !data) return <p className="text-muted-foreground">Đang tải...</p>;

  if (data && data.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed p-6">
        <p className="font-medium">Chưa có dữ liệu nào.</p>
        <p className="text-sm text-muted-foreground">
          Tải file mẫu Excel, điền bảng giá, dịch vụ, câu hỏi thường gặp rồi nhập lên. Hoặc nhờ ChatGPT/Gemini chuyển tài liệu có sẵn sang đúng
          mẫu (hướng dẫn ở mục Nhập file).
        </p>
        <div className="flex flex-wrap gap-2">
          {canEdit && <Button onClick={onImport}>Nhập file</Button>}
          <DownloadButtons showExport={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="w-full sm:w-64"
          placeholder="Tìm theo tên hoặc mã"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Tìm theo tên hoặc mã"
        />
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger className="w-full sm:w-52" aria-label="Lọc theo loại">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {kinds.map((k) => (
              <SelectItem key={k.value} value={k.value}>
                {k.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex flex-wrap gap-2">
          <DownloadButtons showTemplate={false} />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} / {data?.length ?? 0} mục. Bấm vào một dòng để xem đầy đủ.
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead className="hidden md:table-cell">Loại</TableHead>
              <TableHead>Tóm tắt</TableHead>
              <TableHead className="hidden lg:table-cell">Mã</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => (
              <Fragment key={item.id}>
                <TableRow className="cursor-pointer" onClick={() => setOpen(open === item.id ? null : item.id)} aria-expanded={open === item.id}>
                  <TableCell className="font-medium whitespace-normal">{item.title}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline">{item.kindLabel}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-normal text-muted-foreground">{summary(item)}</TableCell>
                  <TableCell className="hidden font-mono text-xs lg:table-cell">{item.code}</TableCell>
                </TableRow>
                {open === item.id && (
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell colSpan={4} className="whitespace-normal">
                      <dl className="grid gap-x-4 gap-y-2 py-2 sm:grid-cols-[12rem_1fr]">
                        <dt className="text-muted-foreground">Mã</dt>
                        <dd className="font-mono text-xs">{item.code}</dd>
                        {item.fields.map((f) => (
                          <Fragment key={f.field}>
                            <dt className="text-muted-foreground">{f.label}</dt>
                            <dd className="whitespace-pre-wrap">{formatFieldValue(f.fieldType, f.value)}</dd>
                          </Fragment>
                        ))}
                        <dt className="text-muted-foreground">Cập nhật</dt>
                        <dd>{formatDateTime(item.updatedAt)}</dd>
                      </dl>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
