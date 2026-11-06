"use client";

import { Fragment, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronRight,
  Database,
  FileUp,
  HandHeart,
  Info,
  Layers,
  MessageCircleQuestion,
  Package,
  Search,
  SearchX,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { FilterLayout, FilterSection } from "@/components/common/filter-layout";
import { FilterPills } from "@/components/common/filter-pills";
import { IconTile, type Tone } from "@/components/common/icon-tile";
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
  { value: "product", label: "Sản phẩm" },
  { value: "faq", label: "Câu hỏi thường gặp" },
  { value: "policy", label: "Chính sách" },
  { value: "info", label: "Thông tin chung" },
];

/** Biểu tượng + màu theo loại để quét bảng nhanh (luôn đi kèm chữ, không dùng màu một mình). */
const kindStyle: Record<string, { icon: LucideIcon; tone: Tone }> = {
  service: { icon: HandHeart, tone: "primary" },
  package: { icon: Layers, tone: "primary" },
  product: { icon: Package, tone: "warning" },
  faq: { icon: MessageCircleQuestion, tone: "success" },
  policy: { icon: ShieldCheck, tone: "muted" },
  info: { icon: Info, tone: "muted" },
};

const kindOf = (kind: string): { icon: LucideIcon; tone: Tone } => kindStyle[kind] ?? { icon: Info, tone: "muted" };

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

  const filtered = query.trim() !== "" || kind !== "all";
  function resetFilters() {
    setQuery("");
    setKind("all");
  }

  return (
    <FilterLayout
      onReset={filtered ? resetFilters : undefined}
      filters={
        <>
          <FilterSection label="Tìm kiếm" htmlFor="knowledge-item-search">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="knowledge-item-search"
                type="search"
                className="h-10 rounded-xl pl-9"
                placeholder="Tên hoặc mã"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </FilterSection>
          <FilterSection label="Loại dữ liệu">
            <FilterPills
              label="Lọc theo loại"
              variant="list"
              value={kind}
              onChange={setKind}
              options={kinds
                .filter((k) => k.value === "all" || counts[k.value])
                .map((k) => ({ value: k.value, label: k.label, count: counts[k.value] ?? 0, icon: k.value === "all" ? Database : kindOf(k.value).icon }))}
            />
          </FilterSection>
        </>
      }
      footer={
        <>
          <p className="text-xs text-pretty text-muted-foreground">Sửa nhiều mục cùng lúc: xuất Excel ở đầu trang, sửa, rồi nhập lại.</p>
          <DownloadButtons showExport={false} />
        </>
      }
    >
      <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pr-0">
                <span className="sr-only">Mở rộng</span>
              </TableHead>
              <SortHead label="Tên" sortKey="title" sort={sort} onSort={toggleSort} />
              <SortHead label="Loại" sortKey="kind" sort={sort} onSort={toggleSort} className="hidden 2xl:table-cell" />
              <TableHead className="hidden sm:table-cell">Nội dung</TableHead>
              <SortHead label="Giá" sortKey="price" sort={sort} onSort={toggleSort} className="text-right" />
              <TableHead className="hidden xl:table-cell">Mã</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => {
              const expanded = open === item.id;
              const price = field(item, "price");
              const priced = item.kind === "service" || item.kind === "package" || item.kind === "product";
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
                      <div className="flex items-start gap-3">
                        <IconTile icon={kindOf(item.kind).icon} tone={kindOf(item.kind).tone} size="sm" className="mt-0.5" />
                        <div className="flex min-w-0 flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-medium">{item.title}</span>
                            {item.medicallyReviewed && <MedicalReviewBadge />}
                          </div>
                          <div className="text-xs text-muted-foreground 2xl:hidden">{item.kindLabel}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden 2xl:table-cell">
                      <span className="inline-flex items-center rounded-full bg-muted/70 px-2.5 py-0.5 text-xs font-medium text-foreground/80">{item.kindLabel}</span>
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
                    <TableCell className="hidden xl:table-cell">
                      <span className="rounded-md bg-muted/70 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{item.code}</span>
                    </TableCell>
                  </TableRow>
                  {expanded && (
                    <TableRow id={`item-${item.id}`} className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={6} className="whitespace-normal">
                        <dl className="grid gap-x-6 gap-y-2.5 rounded-xl border bg-card px-4 py-3 text-sm shadow-card sm:ml-10 sm:grid-cols-[12rem_1fr]">
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
            <IconTile icon={SearchX} tone="muted" size="md" />
            Không có mục nào khớp bộ lọc.
            <Button variant="link" size="sm" onClick={resetFilters}>
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
    </FilterLayout>
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
          "-mx-1.5 inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-1.5 tracking-wider uppercase hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          active && "text-foreground",
        )}
      >
        {label}
        <Icon className={cn("size-3.5", !active && "opacity-50")} aria-hidden />
      </button>
    </TableHead>
  );
}
