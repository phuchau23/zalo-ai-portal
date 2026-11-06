"use client";

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Clock3, Layers, Lock, Package, Plus, Search, SearchX, Sparkles, type LucideIcon } from "lucide-react";
import { FilterLayout, FilterSection } from "@/components/common/filter-layout";
import { FilterPills } from "@/components/common/filter-pills";
import { IconTile } from "@/components/common/icon-tile";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type Branch, type CatalogItem } from "@/lib/api/client";
import { catalogKinds, formatDurationLabel, hasPermission, kindLabels, type CatalogKind } from "@/lib/crm";
import { formatMoney } from "@/lib/format";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { CatalogItemDialog } from "./catalog-item-dialog";

const tabIcons: Record<CatalogKind, LucideIcon> = { service: Sparkles, package: Layers, product: Package };

const emptyHints: Record<CatalogKind, string> = {
  service: "Thêm dịch vụ (ví dụ Massage 60 phút) để nhân viên đặt lịch và bot báo giá.",
  package: "Gói liệu trình gồm nhiều buổi của một hay nhiều dịch vụ, có hạn dùng.",
  product: "Sản phẩm bán kèm (mỹ phẩm, thuốc, phụ kiện). Bật theo dõi kho nếu cần đếm tồn.",
};

export function CatalogPage({ initialTab }: { initialTab: CatalogKind }) {
  const router = useRouter();
  const { me } = useSession();
  const canEdit = hasPermission(me.currentTenant, "manage_catalog");
  const [tab, setTab] = useState<CatalogKind>(initialTab);
  const [creating, setCreating] = useState(false);
  const branches = useApiData(() => call(() => api.GET("/branches", { params: { query: { includeInactive: false } } })));
  const [version, setVersion] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);

  // Điện thoại: hàng tab cuộn ngang → đưa tab đang chọn vào khung nhìn.
  useEffect(() => {
    tabsRef.current?.querySelector<HTMLElement>("[data-state=active]")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab]);

  function changeTab(value: string) {
    if (!catalogKinds.includes(value as CatalogKind)) return;
    setTab(value as CatalogKind);
    router.replace(`/catalog?tab=${value}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Package}
        title="Danh mục bán"
        description="Dịch vụ, gói liệu trình và sản phẩm doanh nghiệp đang bán, dùng cho lịch hẹn và hóa đơn. Giá sửa ở đây cũng cập nhật cho bot."
        help={
          <ul>
            <li>
              <strong>Dịch vụ</strong>: thời lượng + giá, dùng khi đặt lịch. <strong>Gói liệu trình</strong>: số buổi, hạn dùng, bán trong hóa đơn rồi trừ dần mỗi lần khách đến.
            </li>
            <li>
              <strong>Sản phẩm</strong>: hàng bán lẻ. Bật &quot;Theo dõi kho&quot; để Kho hàng tự trừ khi bán.
            </li>
            <li>Mục nhập từ Kho kiến thức tự có ở đây; sửa giá ở một nơi là bot nói đúng giá mới từ tin nhắn tiếp theo.</li>
          </ul>
        }
        actions={
          canEdit && (
            <Button onClick={() => setCreating(true)} className="h-11 sm:h-9">
              <Plus aria-hidden />
              Thêm {kindLabels[tab].toLowerCase()}
            </Button>
          )
        }
      />

      {!canEdit && (
        <Alert>
          <Lock aria-hidden />
          <AlertDescription>Bạn chỉ xem được danh mục. Cần quyền &quot;Quản lý danh mục bán&quot; để thêm hoặc sửa.</AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={changeTab} className="gap-0">
        <div ref={tabsRef} className="-mx-4 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <TabsList variant="pill" aria-label="Loại mục">
            {catalogKinds.map((kind) => {
              const Icon = tabIcons[kind];
              return (
                <TabsTrigger key={kind} value={kind}>
                  <Icon aria-hidden />
                  {kindLabels[kind]}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
        {catalogKinds.map((kind) => (
          <TabsContent key={kind} value={kind} className="pt-4">
            {tab === kind && (
              <CatalogTab
                kind={kind}
                canEdit={canEdit}
                branches={branches.data ?? []}
                version={version}
                onCreate={() => setCreating(true)}
                onChanged={() => setVersion((v) => v + 1)}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      {creating && (
        <CatalogItemDialog
          kind={tab}
          item={null}
          canEdit={canEdit}
          branches={branches.data ?? []}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            setVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}

const collator = new Intl.Collator("vi");
/** Giá trị lọc nhóm: "tất cả" và "chưa xếp nhóm" (nhóm rỗng). */
const allGroups = "__all__";
const noGroup = "__none__";

function CatalogTab({
  kind,
  canEdit,
  branches,
  version,
  onCreate,
  onChanged,
}: {
  kind: CatalogKind;
  canEdit: boolean;
  branches: Branch[];
  version: number;
  onCreate: () => void;
  onChanged: () => void;
}) {
  const [includeInactive, setIncludeInactive] = useState(false);
  const { data, problem, loading, reload } = useApiData(() => call(() => api.GET("/catalog", { params: { query: { kind, includeInactive: true } } })));
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState(allGroups);
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  // Tải lại khi trang cha báo có thay đổi (thêm mới từ nút trên đầu trang); bỏ qua lần đầu vì useApiData đã tải.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    reload();
  }, [version, reload]);

  // Lọc trên dữ liệu đã tải (không gọi lại máy chủ): trạng thái bán → đếm theo nhóm → ô tìm + nhóm đang chọn.
  const shown = useMemo(() => (data ?? []).filter((i) => includeInactive || i.isActive), [data, includeInactive]);
  const groupOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of shown) counts.set(i.groupName ?? "", (counts.get(i.groupName ?? "") ?? 0) + 1);
    return [...counts.entries()]
      .sort(([a], [b]) => collator.compare(a, b))
      .map(([name, count]) => ({ value: name || noGroup, label: name || "Chưa xếp nhóm", count }));
  }, [shown]);
  const activeGroup = groupOptions.some((g) => g.value === groupFilter) ? groupFilter : allGroups;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return shown
      .filter((i) => activeGroup === allGroups || (i.groupName || noGroup) === activeGroup)
      .filter((i) => !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || (i.groupName ?? "").toLowerCase().includes(q))
      .sort((a, b) => collator.compare(a.groupName ?? "", b.groupName ?? "") || collator.compare(a.name, b.name));
  }, [shown, query, activeGroup]);

  if (problem && !data) return <ErrorState problem={problem} onRetry={reload} />;
  if (loading && !data) return <LoadingRows columns={4} />;

  const inactiveCount = (data ?? []).filter((i) => !i.isActive).length;
  const activeCount = (data ?? []).filter((i) => i.isActive).length;
  const knownCount = (data ?? []).filter((i) => i.isActive && i.inKnowledge).length;
  const KindIcon = tabIcons[kind];
  const filtered = query.trim() !== "" || includeInactive || activeGroup !== allGroups;

  if (data && data.length === 0) {
    return (
      <EmptyState icon={KindIcon} title={`Chưa có ${kindLabels[kind].toLowerCase()} nào`} description={emptyHints[kind]}>
        {canEdit && (
          <Button onClick={onCreate} className="h-11 sm:h-9">
            <Plus aria-hidden />
            Thêm {kindLabels[kind].toLowerCase()}
          </Button>
        )}
      </EmptyState>
    );
  }

  // Chia bảng theo nhóm (dữ liệu đã sắp theo nhóm rồi theo tên): mỗi nhóm có một dòng tiêu đề nhỏ.
  const groups: { name: string; items: CatalogItem[] }[] = [];
  for (const item of rows) {
    const name = item.groupName ?? "";
    const last = groups.at(-1);
    if (last && last.name === name) last.items.push(item);
    else groups.push({ name, items: [item] });
  }

  return (
    <div className="flex flex-col gap-3">
      <FilterLayout
        onReset={
          filtered
            ? () => {
                setQuery("");
                setIncludeInactive(false);
                setGroupFilter(allGroups);
              }
            : undefined
        }
        filters={
          <>
            <FilterSection label="Tìm kiếm" htmlFor={`catalog-search-${kind}`}>
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id={`catalog-search-${kind}`}
                  type="search"
                  className="h-11 rounded-xl pl-9 sm:h-9"
                  placeholder="Tên, nhóm hoặc mã"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </FilterSection>

            {groupOptions.length > 1 && (
              <FilterSection label="Nhóm">
                <FilterPills
                  variant="list"
                  label="Lọc theo nhóm"
                  value={activeGroup}
                  onChange={setGroupFilter}
                  options={[{ value: allGroups, label: "Tất cả nhóm", count: shown.length }, ...groupOptions]}
                />
              </FilterSection>
            )}

            <FilterSection label="Trạng thái bán">
              <Label htmlFor={`inactive-${kind}`} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-normal sm:min-h-9">
                <Checkbox id={`inactive-${kind}`} checked={includeInactive} onCheckedChange={(v) => setIncludeInactive(v === true)} />
                Hiện mục ngừng bán {inactiveCount > 0 && <span className="tabular text-muted-foreground">({inactiveCount})</span>}
              </Label>
            </FilterSection>

            {/* Chỉ để xem nhanh, không phải bộ lọc: ẩn trên màn hẹp cho cột lọc gọn. */}
            <div className="hidden lg:block">
              <FilterSection label="Bot đã biết">
                <div className="flex flex-col gap-1.5">
                  <p className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="tabular font-semibold">
                      {knownCount}/{activeCount}
                    </span>
                    <span className="text-xs text-muted-foreground">mục đang bán</span>
                  </p>
                  <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span className="block h-full rounded-full bg-success" style={{ width: `${activeCount ? (knownCount / activeCount) * 100 : 0}%` }} />
                  </span>
                  <p className="text-xs text-pretty text-muted-foreground">Chấm xanh ở biểu tượng: bot đã có mục này trong Kho kiến thức.</p>
                </div>
              </FilterSection>
            </div>
          </>
        }
      >
        <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead className="hidden sm:table-cell">{kind === "product" ? "Mã SKU · đơn vị" : "Thời lượng"}</TableHead>
                <TableHead className="text-right">Giá</TableHead>
                <TableHead className="hidden xl:table-cell">Mã</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <Fragment key={group.name || noGroup}>
                  <TableRow className="bg-muted/35 hover:bg-muted/35">
                    <TableCell colSpan={4} className="py-2">
                      <span className="flex items-center gap-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                        {group.name || "Chưa xếp nhóm"}
                        <span className="tabular rounded-full bg-foreground/[0.07] px-1.5 py-px text-[10px] tracking-normal">{group.items.length}</span>
                      </span>
                    </TableCell>
                  </TableRow>
                  {group.items.map((item) => {
                    const duration = kind === "product" ? "" : formatDurationLabel(item);
                    return (
                      <TableRow key={item.id} className={cn("group cursor-pointer", !item.isActive && "opacity-60")} onClick={() => setSelected(item)}>
                        <TableCell className="min-w-[12rem] whitespace-normal">
                          <button
                            type="button"
                            className="flex items-center gap-3 rounded-lg text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(item);
                            }}
                          >
                            <span className="relative shrink-0" title={item.inKnowledge ? "Bot đã biết mục này (Kho kiến thức)" : "Bot chưa biết mục này"}>
                              <IconTile icon={KindIcon} tone={item.isActive ? "primary" : "muted"} size="sm" />
                              {item.inKnowledge && <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full bg-success ring-2 ring-card" aria-hidden />}
                            </span>
                            <span className="flex min-w-0 flex-col gap-0.5">
                              <span className="font-medium transition-colors group-hover:text-primary">{item.name}</span>
                              {(!item.isActive || duration) && (
                                <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                                  {!item.isActive && <Badge variant="secondary">Ngừng bán</Badge>}
                                  {duration && <span className="sm:hidden">{duration}</span>}
                                </span>
                              )}
                            </span>
                            <span className="sr-only">{item.inKnowledge ? ", bot đã biết" : ", bot chưa biết"}</span>
                          </button>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {kind === "product" ? (
                            <span className="text-muted-foreground">{[item.sku, item.unit].filter(Boolean).join(" · ") || "—"}</span>
                          ) : duration ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              <Clock3 className="size-3" aria-hidden />
                              {duration}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-normal">
                          {item.price === null ? (
                            <span className="ml-auto line-clamp-2 block max-w-[14rem] text-xs text-muted-foreground">{item.priceNote || "Liên hệ"}</span>
                          ) : (
                            <span className="tabular font-semibold whitespace-nowrap">{formatMoney(item.price)}</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{item.code}</code>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              ))}
            </TableBody>
          </Table>
          {rows.length === 0 && (
            <EmptyState icon={SearchX} title="Không có mục nào khớp bộ lọc" description="Thử từ khóa khác, chọn nhóm khác hoặc hiện cả mục ngừng bán." compact>
              <Button
                variant="outline"
                size="sm"
                className="h-11 sm:h-8"
                onClick={() => {
                  setQuery("");
                  setGroupFilter(allGroups);
                  setIncludeInactive(true);
                }}
              >
                Xóa bộ lọc
              </Button>
            </EmptyState>
          )}
          <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
            <span className="tabular">
              Hiển thị {rows.length} / {data?.length ?? 0} mục
            </span>
            <span className="hidden sm:inline">{branches.length > 1 ? "Bấm vào một dòng để sửa, chọn chi nhánh bán" : "Bấm vào một dòng để xem hoặc sửa"}</span>
          </div>
        </div>
      </FilterLayout>

      {selected && (
        <CatalogItemDialog
          kind={kind}
          item={selected}
          canEdit={canEdit}
          branches={branches}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            reload();
            onChanged();
          }}
        />
      )}
    </div>
  );
}
