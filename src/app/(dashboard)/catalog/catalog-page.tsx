"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Layers, Lock, Package, Plus, Search, SearchX, Sparkles, type LucideIcon } from "lucide-react";
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
        <div className="overflow-x-auto border-b">
          <TabsList variant="line" className="group-data-horizontal/tabs:h-10">
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
          <TabsContent key={kind} value={kind} className="pt-5">
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

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? [])
      .filter((i) => (includeInactive || i.isActive) && (!q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q) || (i.groupName ?? "").toLowerCase().includes(q)))
      .sort((a, b) => collator.compare(a.groupName ?? "", b.groupName ?? "") || collator.compare(a.name, b.name));
  }, [data, query, includeInactive]);

  if (problem && !data) return <ErrorState problem={problem} onRetry={reload} />;
  if (loading && !data) return <LoadingRows columns={4} />;

  const inactiveCount = (data ?? []).filter((i) => !i.isActive).length;

  if (data && data.length === 0) {
    return (
      <EmptyState icon={Boxes} title={`Chưa có ${kindLabels[kind].toLowerCase()} nào`} description={emptyHints[kind]}>
        {canEdit && (
          <Button onClick={onCreate} className="h-11 sm:h-9">
            <Plus aria-hidden />
            Thêm {kindLabels[kind].toLowerCase()}
          </Button>
        )}
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" className="h-11 pl-9 sm:h-9" placeholder="Tìm theo tên, nhóm hoặc mã" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Tìm theo tên, nhóm hoặc mã" />
        </div>
        <Label htmlFor={`inactive-${kind}`} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-normal sm:min-h-0">
          <Checkbox id={`inactive-${kind}`} checked={includeInactive} onCheckedChange={(v) => setIncludeInactive(v === true)} />
          Hiện mục ngừng bán {inactiveCount > 0 && <span className="tabular text-muted-foreground">({inactiveCount})</span>}
        </Label>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên</TableHead>
              <TableHead className="hidden md:table-cell">Nhóm</TableHead>
              <TableHead className="hidden sm:table-cell">{kind === "product" ? "Mã SKU · đơn vị" : "Thời lượng"}</TableHead>
              <TableHead className="text-right">Giá</TableHead>
              <TableHead className="hidden lg:table-cell">Mã</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.id} className={cn("cursor-pointer", !item.isActive && "text-muted-foreground")} onClick={() => setSelected(item)}>
                <TableCell className="whitespace-normal">
                  <button type="button" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-left font-medium focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" onClick={() => setSelected(item)}>
                    <span
                      className={cn("size-2 shrink-0 rounded-full", item.inKnowledge ? "bg-success" : "bg-muted-foreground/40")}
                      title={item.inKnowledge ? "Bot đã biết mục này (Kho kiến thức)" : "Bot chưa biết mục này"}
                      aria-hidden
                    />
                    {item.name}
                    {!item.isActive && <Badge variant="secondary">Ngừng bán</Badge>}
                    <span className="sr-only">{item.inKnowledge ? ", bot đã biết" : ", bot chưa biết"}</span>
                  </button>
                  {item.groupName && <div className="mt-0.5 text-xs text-muted-foreground md:hidden">{item.groupName}</div>}
                </TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">{item.groupName ?? "—"}</TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">
                  {kind === "product" ? [item.sku, item.unit].filter(Boolean).join(" · ") || "—" : formatDurationLabel(item) || "—"}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {item.price === null ? <span className="font-normal text-muted-foreground">{item.priceNote || "Liên hệ"}</span> : formatMoney(item.price)}
                </TableCell>
                <TableCell className="hidden font-mono text-xs text-muted-foreground lg:table-cell">{item.code}</TableCell>
              </TableRow>
            ))}
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
                setIncludeInactive(true);
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
          <span className="hidden sm:inline">
            <span className="mr-1 inline-block size-2 rounded-full bg-success align-middle" aria-hidden />
            Bot đã biết · {branches.length > 1 ? "Bấm vào một dòng để sửa, chọn chi nhánh bán" : "Bấm vào một dòng để xem hoặc sửa"}
          </span>
        </div>
      </div>

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
