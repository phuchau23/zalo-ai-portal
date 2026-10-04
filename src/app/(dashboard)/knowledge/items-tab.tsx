"use client";

import { Fragment, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Database, FileUp, Search, SearchX } from "lucide-react";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { call } from "@/lib/api/call";
import { api, type KnowledgeItem } from "@/lib/api/client";
import { formatDateTime, formatFieldValue } from "@/lib/format";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { DownloadButtons } from "./download-buttons";
import { MedicalReviewBadge, MedicalReviewToggle } from "./medical-review";

const kinds = [
  { value: "all", label: "Tất cả" },
  { value: "service", label: "Dịch vụ" },
  { value: "package", label: "Gói liệu trình" },
  { value: "faq", label: "Câu hỏi thường gặp" },
  { value: "policy", label: "Chính sách" },
  { value: "info", label: "Thông tin chung" },
];

/** Chấm màu theo loại để quét bảng nhanh (luôn đi kèm chữ, không dùng màu một mình). */
const kindDot: Record<string, string> = {
  service: "bg-primary",
  package: "bg-chart-2",
  faq: "bg-success",
  policy: "bg-warning",
  info: "bg-muted-foreground",
};

type SortKey = "title" | "kind" | "price";
type Sort = { key: SortKey; dir: "asc" | "desc" } | null;

const field = (item: KnowledgeItem, name: string) => item.fields.find((f) => f.field === name);

function priceOf(item: KnowledgeItem): number | null {
  const value = Number(field(item, "price")?.value);
  return Number.isFinite(value) && field(item, "price")?.value ? value : null;
}

/** Cột "Nội dung": thời lượng/số buổi cho dịch vụ & gói, câu trả lời / nội dung cho loại khác. */
function detail(item: KnowledgeItem): string {
  if (item.kind === "service" || item.kind === "package") {
    const minutes = field(item, "durationMinutes") ?? field(item, "minutesPerSession");
    const sessions = field(item, "sessions");
    const parts: string[] = [];
    if (sessions) parts.push(`${sessions.value} buổi`);
    if (minutes) parts.push(`${minutes.value} phút${sessions ? "/buổi" : ""}`);
    return parts.join(" · ");
  }

  const text = field(item, "answer") ?? field(item, "content");
  return text?.value ?? "";
}

const collator = new Intl.Collator("vi");

export function ItemsTab({ canEdit, onImport }: { canEdit: boolean; onImport: () => void }) {
  const { data, problem, loading, reload } = useApiData(() => call(() => api.GET("/knowledge/items")));
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>(null);

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: data?.length ?? 0 };
    for (const item of data ?? []) result[item.kind] = (result[item.kind] ?? 0) + 1;
    return result;
  }, [data]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (data ?? []).filter(
      (item) =>
        (kind === "all" || item.kind === kind) &&
        (!q || item.title.toLowerCase().includes(q) || item.code.toLowerCase().includes(q)),
    );
    if (!sort) return filtered;

    const dir = sort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sort.key === "price") {
        // Mục không có giá luôn nằm cuối.
        const pa = priceOf(a);
        const pb = priceOf(b);
        if (pa === null || pb === null) return pa === pb ? 0 : pa === null ? 1 : -1;
        return (pa - pb) * dir;
      }
      const va = sort.key === "title" ? a.title : a.kindLabel;
      const vb = sort.key === "title" ? b.title : b.kindLabel;
      return collator.compare(va, vb) * dir;
    });
  }, [data, kind, query, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s?.key !== key ? { key, dir: "asc" } : s.dir === "asc" ? { key, dir: "desc" } : null));
  }

  if (problem && !data) return <ErrorState problem={problem} onRetry={reload} />;
  if (loading && !data) return <LoadingRows columns={5} />;

  if (data && data.length === 0) {
    return (
      <EmptyState
        icon={Database}
        title="Chưa có dữ liệu nào"
        description="Tải file mẫu Excel, điền bảng giá, dịch vụ, câu hỏi thường gặp rồi nhập lên. Hoặc nhờ ChatGPT/Gemini chuyển tài liệu có sẵn sang đúng mẫu (hướng dẫn ở tab Nhập file)."
      >
        {canEdit && (
          <Button onClick={onImport}>
            <FileUp aria-hidden />
            Nhập file
          </Button>
        )}
        <DownloadButtons showExport={false} />
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            className="pl-9"
            placeholder="Tìm theo tên hoặc mã"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Tìm theo tên hoặc mã"
          />
        </div>
        <div role="group" aria-label="Lọc theo loại" className="flex gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {kinds
            .filter((k) => k.value === "all" || counts[k.value])
            .map((k) => (
              <Button
                key={k.value}
                variant="outline"
                size="sm"
                aria-pressed={kind === k.value}
                onClick={() => setKind(k.value)}
                className="aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground"
              >
                {k.label}
                <span className="tabular text-xs text-muted-foreground">{counts[k.value] ?? 0}</span>
              </Button>
            ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pr-0">
                <span className="sr-only">Mở rộng</span>
              </TableHead>
              <SortHead label="Tên" sortKey="title" sort={sort} onSort={toggleSort} />
              <SortHead label="Loại" sortKey="kind" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
              <TableHead className="hidden sm:table-cell">Nội dung</TableHead>
              <SortHead label="Giá" sortKey="price" sort={sort} onSort={toggleSort} className="text-right" />
              <TableHead className="hidden lg:table-cell">Mã</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => {
              const expanded = open === item.id;
              const price = field(item, "price");
              const priced = item.kind === "service" || item.kind === "package";
              return (
                <Fragment key={item.id}>
                  <TableRow className={cn("cursor-pointer", expanded && "bg-accent/40 hover:bg-accent/40")} onClick={() => setOpen(expanded ? null : item.id)}>
                    <TableCell className="pr-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-expanded={expanded}
                        aria-controls={`item-${item.id}`}
                        aria-label={`${expanded ? "Thu gọn" : "Xem chi tiết"} ${item.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpen(expanded ? null : item.id);
                        }}
                      >
                        <ChevronRight className={cn("transition-transform", expanded && "rotate-90")} />
                      </Button>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium">{item.title}</span>
                        {item.medicallyReviewed && <MedicalReviewBadge />}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground md:hidden">
                        <span className={cn("size-1.5 rounded-full", kindDot[item.kind] ?? "bg-muted-foreground")} aria-hidden />
                        {item.kindLabel}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <span className={cn("size-2 rounded-full", kindDot[item.kind] ?? "bg-muted-foreground")} aria-hidden />
                        {item.kindLabel}
                      </span>
                    </TableCell>
                    <TableCell className="hidden max-w-md whitespace-normal text-muted-foreground sm:table-cell">
                      <span className="line-clamp-2">{detail(item) || "—"}</span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {priced ? (
                        price?.value ? (
                          formatFieldValue("money", price.value)
                        ) : (
                          <span className="font-normal text-muted-foreground">Liên hệ</span>
                        )
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">{item.code}</TableCell>
                  </TableRow>
                  {expanded && (
                    <TableRow id={`item-${item.id}`} className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={6} className="whitespace-normal">
                        <dl className="grid gap-x-6 gap-y-2.5 py-2 pl-10 text-sm sm:grid-cols-[12rem_1fr]">
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
                          <dt className="text-muted-foreground">Duyệt chuyên môn</dt>
                          <dd>
                            <MedicalReviewToggle target="items" id={item.id} reviewed={item.medicallyReviewed} canEdit={canEdit} onChanged={reload} />
                          </dd>
                        </dl>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>

        {rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted-foreground">
            <SearchX className="size-5" aria-hidden />
            Không có mục nào khớp bộ lọc.
            <Button
              variant="link"
              size="sm"
              onClick={() => {
                setQuery("");
                setKind("all");
              }}
            >
              Xóa bộ lọc
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <span className="tabular">
            Hiển thị {rows.length} / {data?.length ?? 0} mục
          </span>
          <span className="hidden sm:inline">Bấm vào một dòng để xem đầy đủ</span>
        </div>
      </div>
    </div>
  );
}

function SortHead({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  sort: Sort;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sort?.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "-mx-1.5 inline-flex h-7 items-center gap-1 rounded-sm px-1.5 hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          active && "text-foreground",
        )}
      >
        {label}
        <Icon className={cn("size-3.5", !active && "opacity-50")} aria-hidden />
      </button>
    </TableHead>
  );
}
