"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ChevronRight, FileSpreadsheet, Phone, Search, Upload, Users } from "lucide-react";
import { FilterLayout, FilterSection } from "@/components/common/filter-layout";
import { FilterPills } from "@/components/common/filter-pills";
import { LeadStatusBadge, leadStatusLook } from "@/components/common/lead-status-badge";
import { PersonAvatar } from "@/components/common/person-avatar";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type ContactItem } from "@/lib/api/client";
import { leadStatuses, type LeadStatus } from "@/lib/customers";
import { fadeUp, stagger } from "@/lib/motion";
import { useApiData, useNow } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { elapsed } from "../inbox/inbox-utils";

const allTags = "__all__";

/**
 * Danh sách khách, bố cục 3/7 (FilterLayout): cột trái là bộ lọc (tìm, tầng tiềm năng có số đếm — "Nóng" tô cam khi có khách,
 * nhãn) + nút Nhập/Xuất ở cuối; bên phải là bảng có ảnh đại diện chữ cái (máy tính) hoặc thẻ (điện thoại).
 */
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

  const filtered = status !== "all" || tag !== allTags || query !== "";
  function resetFilters() {
    setStatus("all");
    setTag(allTags);
    setQuery("");
  }

  return (
    <FilterLayout
      onReset={filtered ? resetFilters : undefined}
      filters={
        <>
          <FilterSection label="Tìm khách" htmlFor="customer-search">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="customer-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tên hoặc số điện thoại"
                className="h-11 w-full rounded-xl border-transparent bg-muted/60 pl-9 shadow-none focus-visible:bg-background sm:h-10"
              />
            </div>
          </FilterSection>

          <FilterSection label="Mức độ tiềm năng">
            <FilterPills<LeadStatus | "all">
              label="Lọc theo mức độ tiềm năng"
              variant="list"
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: "Tất cả", count: total, icon: Users, tone: "primary" },
                ...leadStatuses.map((s) => ({
                  value: s.value,
                  label: s.label,
                  count: counts[s.value] ?? 0,
                  alert: s.value === "hot",
                  icon: leadStatusLook[s.value].icon,
                  tone: leadStatusLook[s.value].tone,
                })),
              ]}
            />
          </FilterSection>

          {(data?.allTags.length ?? 0) > 0 && (
            <FilterSection label="Nhãn" htmlFor="customer-tag">
              <Select value={tag} onValueChange={setTag}>
                <SelectTrigger id="customer-tag" className="h-11 w-full rounded-xl sm:h-10">
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
            </FilterSection>
          )}
        </>
      }
      footer={
        <>
          <Link href="/customers/import" className={cn(buttonVariants({ variant: "outline" }), "h-11 w-full rounded-xl sm:h-10")}>
            <Upload aria-hidden />
            Nhập danh sách
          </Link>
          {isOwner && (
            <a className={cn(buttonVariants({ variant: "outline" }), "h-11 w-full rounded-xl sm:h-10")} href={`/api/contacts/export?${exportQuery}`} download>
              <FileSpreadsheet aria-hidden />
              Xuất Excel
            </a>
          )}
        </>
      }
    >
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
            <Button variant="outline" onClick={resetFilters}>
              Bỏ bộ lọc
            </Button>
          )}
        </EmptyState>
      )}

      {data && data.items.length > 0 && (
        <>
          {/* Điện thoại: dạng thẻ */}
          <motion.ul key={`${status}-${tag}-${search}`} variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-2 md:hidden">
            {data.items.map((c) => (
              <motion.li key={c.id} variants={fadeUp}>
                <Link
                  href={`/customers/${c.id}`}
                  className="flex min-h-11 items-center gap-3 rounded-2xl border bg-card p-3 shadow-card transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <PersonAvatar name={c.name} size="md" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold">{c.name}</span>
                      <StatusBadge contact={c} />
                    </span>
                    <span className="truncate text-sm text-muted-foreground">{[c.phone, c.interest].filter(Boolean).join(" · ") || "Chưa có thông tin"}</span>
                    <Meta contact={c} now={now} />
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </motion.li>
            ))}
          </motion.ul>

          {/* Máy tính: dạng bảng */}
          <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Khách</TableHead>
                  <TableHead>Số điện thoại</TableHead>
                  <TableHead className="hidden md:table-cell lg:hidden xl:table-cell">Nhu cầu</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Tin cuối</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((c) => (
                  <TableRow key={c.id} className="group relative">
                    <TableCell className="max-w-72">
                      <div className="flex items-center gap-3">
                        <PersonAvatar name={c.name} size="sm" />
                        <div className="flex min-w-0 flex-col gap-1">
                          <Link
                            href={`/customers/${c.id}`}
                            className="truncate rounded-sm font-medium transition-colors after:absolute after:inset-0 group-hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                          >
                            {c.name}
                          </Link>
                          <Meta contact={c} now={now} hideTime />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="tabular">
                      {c.phone ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Phone className="size-3.5 text-muted-foreground" aria-hidden />
                          {c.phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden max-w-56 truncate md:table-cell lg:hidden xl:table-cell">{c.interest ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      <StatusBadge contact={c} />
                    </TableCell>
                    <TableCell className="tabular text-right text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        {c.lastCustomerMessageAt ? elapsed(c.lastCustomerMessageAt, now) : "—"}
                        <ChevronRight
                          className="size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none"
                          aria-hidden
                        />
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data.truncated && <p className="text-sm text-muted-foreground">Đang hiện 500 khách gần nhất. Dùng ô tìm kiếm hoặc bộ lọc để thu hẹp.</p>}
        </>
      )}
    </FilterLayout>
  );
}

function StatusBadge({ contact }: { contact: ContactItem }) {
  return <LeadStatusBadge status={contact.leadStatus} manual={contact.leadStatusManual} />;
}

function Meta({ contact, now, hideTime }: { contact: ContactItem; now: number; hideTime?: boolean }) {
  if (!contact.isTest && contact.tags.length === 0 && (hideTime || !contact.lastCustomerMessageAt)) return null;
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      {contact.isTest && <span className="rounded-md bg-muted px-1.5 py-px text-[10px] font-semibold uppercase">Chat thử</span>}
      {contact.channel === "phone" && <span className="rounded-md bg-info/10 px-1.5 py-px text-[10px] font-semibold text-info uppercase">Chỉ có SĐT</span>}
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
