"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileSpreadsheet, Search, Users } from "lucide-react";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type ContactItem } from "@/lib/api/client";
import { leadStatuses, leadStatusOf, type LeadStatus } from "@/lib/customers";
import { useApiData, useNow } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { elapsed } from "../inbox/inbox-utils";

const allTags = "__all__";

export function CustomersPage() {
  const { me } = useSession();
  const isOwner = me.currentTenant?.role === "owner";
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [tag, setTag] = useState(allTags);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState(""); // giá trị đã "chốt" sau khi ngừng gõ
  const now = useNow();

  const { data, problem, loading, reload } = useApiData(() =>
    call(() =>
      api.GET("/contacts", {
        params: { query: { status: status === "all" ? undefined : status, tag: tag === allTags ? undefined : tag, q: search || undefined, includeTest: true } },
      }),
    ),
  );

  // Tìm theo tên/SĐT: chờ người dùng ngừng gõ 300ms rồi mới gọi API.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    reload();
  }, [status, tag, search, me.currentTenant?.id, reload]);

  const counts = data?.counts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const exportQuery = new URLSearchParams({ includeTest: "false" });
  if (status !== "all") exportQuery.set("status", status);
  if (tag !== allTags) exportQuery.set("tag", tag);
  if (search) exportQuery.set("q", search);

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Lọc theo mức độ tiềm năng" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <FilterChip active={status === "all"} onClick={() => setStatus("all")} label="Tất cả" count={total} />
        {leadStatuses.map((s) => (
          <FilterChip key={s.value} active={status === s.value} onClick={() => setStatus(s.value)} label={s.label} count={counts[s.value] ?? 0} />
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="customer-search" className="sr-only">
            Tìm khách
          </Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="customer-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc số điện thoại"
              className="h-11 pl-9 sm:h-9"
            />
          </div>
        </div>
        {(data?.allTags.length ?? 0) > 0 && (
          <Select value={tag} onValueChange={setTag}>
            <SelectTrigger className="h-11 w-full sm:h-9 sm:w-48" aria-label="Lọc theo nhãn">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={allTags}>Mọi nhãn</SelectItem>
              {data?.allTags.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {isOwner && (
          <a className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-9")} href={`/api/contacts/export?${exportQuery}`} download>
            <FileSpreadsheet aria-hidden />
            Xuất Excel
          </a>
        )}
      </div>

      {problem && !data && <ErrorState problem={problem} onRetry={reload} />}
      {loading && !data && <LoadingRows rows={6} columns={5} label="Đang tải danh sách khách" />}
      {data && data.items.length === 0 && (
        <EmptyState
          icon={Users}
          title={total === 0 ? "Chưa có khách nào" : "Không có khách khớp bộ lọc"}
          description={
            total === 0
              ? "Khi khách nhắn vào Zalo OA (hoặc bạn thử ở trang Chat thử), khách sẽ tự hiện ở đây."
              : "Thử bỏ bớt bộ lọc hoặc tìm bằng từ khác."
          }
        >
          {total === 0 ? (
            <Link href="/chat-test" className={buttonVariants({ variant: "outline" })}>
              Mở Chat thử
            </Link>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                setStatus("all");
                setTag(allTags);
                setQuery("");
              }}
            >
              Bỏ bộ lọc
            </Button>
          )}
        </EmptyState>
      )}

      {data && data.items.length > 0 && (
        <>
          {/* Điện thoại: dạng thẻ */}
          <ul className="flex flex-col gap-2 md:hidden">
            {data.items.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/customers/${c.id}`}
                  className="flex min-h-11 items-center gap-3 rounded-lg border bg-card p-3 hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-medium">{c.name}</span>
                      <StatusBadge contact={c} />
                    </span>
                    <span className="truncate text-sm text-muted-foreground">{[c.phone, c.interest].filter(Boolean).join(" · ") || "Chưa có thông tin"}</span>
                    <Meta contact={c} now={now} />
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>

          {/* Máy tính: dạng bảng */}
          <div className="hidden overflow-hidden rounded-lg border md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Khách</TableHead>
                  <TableHead>Số điện thoại</TableHead>
                  <TableHead>Nhu cầu</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Tin cuối</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((c) => (
                  <TableRow key={c.id} className="relative">
                    <TableCell className="max-w-64">
                      <Link
                        href={`/customers/${c.id}`}
                        className="flex flex-col gap-1 rounded-sm font-medium after:absolute after:inset-0 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <span className="truncate">{c.name}</span>
                      </Link>
                      <Meta contact={c} now={now} hideTime />
                    </TableCell>
                    <TableCell className="tabular">{c.phone ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="max-w-56 truncate">{c.interest ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <StatusBadge contact={c} />
                    </TableCell>
                    <TableCell className="tabular text-right text-muted-foreground">{c.lastCustomerMessageAt ? elapsed(c.lastCustomerMessageAt, now) : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data.truncated && <p className="text-sm text-muted-foreground">Đang hiện 500 khách gần nhất. Dùng ô tìm kiếm hoặc bộ lọc để thu hẹp.</p>}
        </>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <Button
      size="sm"
      variant="outline"
      aria-pressed={active}
      onClick={onClick}
      className="h-11 shrink-0 sm:h-8 aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground"
    >
      {label}
      <span className="tabular text-xs text-muted-foreground">{count}</span>
    </Button>
  );
}

function StatusBadge({ contact }: { contact: ContactItem }) {
  const s = leadStatusOf(contact.leadStatus);
  return (
    <Badge variant={s.variant} className="shrink-0" title={contact.leadStatusManual ? "Nhân viên đã đặt" : "Hệ thống tự xếp"}>
      {s.label}
    </Badge>
  );
}

function Meta({ contact, now, hideTime }: { contact: ContactItem; now: number; hideTime?: boolean }) {
  if (!contact.isTest && contact.tags.length === 0 && (hideTime || !contact.lastCustomerMessageAt)) return null;
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {contact.isTest && <Badge variant="outline">Chat thử</Badge>}
      {contact.tags.map((t) => (
        <Badge key={t} variant="secondary">
          {t}
        </Badge>
      ))}
      {!hideTime && contact.lastCustomerMessageAt && <span>Nhắn {ago(contact.lastCustomerMessageAt, now)}</span>}
    </span>
  );
}

function ago(iso: string, now: number) {
  const e = elapsed(iso, now);
  return e === "vừa xong" ? e : `${e} trước`;
}
