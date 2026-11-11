"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Boxes, ClipboardCheck, History, Lock, PackagePlus, Scissors, Store, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type Branch, type CatalogItem } from "@/lib/api/client";
import { hasPermission } from "@/lib/crm";
import { inventoryTabs, isInventoryTab, type InventoryTab } from "@/lib/inventory";
import { useApiData } from "@/lib/use-api-data";
import { ConsumablesSection } from "./consumables-section";
import { CountsSection } from "./counts-section";
import { MovementsSection } from "./movements-section";
import { PurchasesSection } from "./purchases-section";
import { StockSection } from "./stock-section";
import { TransfersSection } from "./transfers-section";

const tabMeta: Record<InventoryTab, { label: string; icon: LucideIcon }> = {
  stock: { label: "Tồn kho", icon: Boxes },
  movements: { label: "Lịch sử", icon: History },
  purchases: { label: "Nhập hàng", icon: PackagePlus },
  transfers: { label: "Chuyển kho", icon: ArrowLeftRight },
  counts: { label: "Kiểm kê", icon: ClipboardCheck },
  consumables: { label: "Định mức", icon: Scissors },
};

/** Props chung cho các tab kho. `version` tăng khi có thay đổi ở tab khác để tải lại tồn. */
export type InventoryContext = {
  branchId: string;
  branches: Branch[];
  products: CatalogItem[];
  canEdit: boolean;
  version: number;
  onChanged: () => void;
};

/** Kho hàng: tồn theo chi nhánh, lịch sử xuất nhập, phiếu nhập, chuyển kho, kiểm kê, định mức tiêu hao theo dịch vụ. */
export function InventoryPage({ initialTab }: { initialTab: InventoryTab }) {
  const router = useRouter();
  const { me } = useSession();
  const canEdit = hasPermission(me.currentTenant, "manage_inventory");
  const [tab, setTab] = useState<InventoryTab>(initialTab);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [version, setVersion] = useState(0);
  const tabsRef = useRef<HTMLDivElement>(null);

  const branches = useApiData(() => call(() => api.GET("/branches", { params: { query: { includeInactive: false } } })));
  const catalog = useApiData(() => call(() => api.GET("/catalog", { params: { query: { kind: "product", includeInactive: false } } })));
  const branchList = useMemo(() => branches.data ?? [], [branches.data]);
  const products = useMemo(() => (catalog.data ?? []).filter((p) => p.trackInventory), [catalog.data]);
  const ready = Boolean(branches.data && catalog.data);

  // Điện thoại: hàng tab cuộn ngang → đưa tab đang chọn vào khung nhìn (cả khi vào thẳng bằng ?tab=).
  useEffect(() => {
    tabsRef.current?.querySelector<HTMLElement>("[data-state=active]")?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab, ready]);

  const branchId = useMemo(() => {
    if (selectedBranch && branchList.some((b) => b.id === selectedBranch)) return selectedBranch;
    const mine = me.currentTenant?.branchId;
    if (mine && branchList.some((b) => b.id === mine)) return mine;
    return branchList.find((b) => b.isDefault)?.id ?? branchList[0]?.id ?? "";
  }, [selectedBranch, branchList, me.currentTenant?.branchId]);

  function changeTab(value: string) {
    if (!isInventoryTab(value)) return;
    setTab(value);
    router.replace(`/inventory?tab=${value}`, { scroll: false });
  }

  const loadProblem = branches.problem && !branches.data ? branches.problem : catalog.problem && !catalog.data ? catalog.problem : null;
  const ctx: InventoryContext = { branchId, branches: branchList, products, canEdit, version, onChanged: () => setVersion((v) => v + 1) };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Boxes}
        title="Kho hàng"
        description="Tồn sản phẩm theo chi nhánh. Bán hàng tự trừ kho, dịch vụ tự trừ vật tư theo định mức."
        help={
          <ul>
            <li>
              <strong>Nhập hàng</strong>: tạo phiếu nhập, bấm Nhận để cộng tồn; giá vốn tự tính bình quân.
            </li>
            <li>Bán sản phẩm trong hóa đơn tự trừ kho; hủy hóa đơn tự trả lại kho.</li>
            <li>
              <strong>Định mức vật tư</strong>: mỗi buổi dịch vụ dùng bao nhiêu (ví dụ 0,05 chai dầu) → hoàn thành lịch là tự trừ.
            </li>
            <li>
              Đặt <strong>mức tối thiểu</strong> để thấy cảnh báo &quot;Sắp hết&quot;; kiểm kê định kỳ để số trên máy khớp thực tế.
            </li>
          </ul>
        }
        meta={
          products.length === 0 && catalog.data ? (
            <p className="text-sm text-muted-foreground">Chưa có sản phẩm nào bật &quot;Theo dõi kho&quot;. Bật trong Danh mục → Sản phẩm.</p>
          ) : undefined
        }
      />

      {!canEdit && (
        <Alert>
          <Lock aria-hidden />
          <AlertDescription>Bạn chỉ xem được kho. Cần quyền &quot;Quản lý kho&quot; để nhập, chuyển, kiểm kê hay điều chỉnh.</AlertDescription>
        </Alert>
      )}

      {loadProblem ? (
        <ErrorState
          problem={loadProblem}
          onRetry={() => {
            branches.reload();
            catalog.reload();
          }}
        />
      ) : !branches.data || !catalog.data ? (
        <LoadingRows rows={4} columns={5} label="Đang tải kho" />
      ) : branchList.length === 0 ? (
        <EmptyState icon={Boxes} title="Chưa có chi nhánh" description="Thêm chi nhánh ở Cài đặt trước khi quản lý kho." />
      ) : (
        <Tabs value={tab} onValueChange={changeTab} className="gap-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div ref={tabsRef} className="-mx-4 overflow-x-auto px-4 py-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
              <TabsList variant="pill" aria-label="Mục kho hàng">
                {inventoryTabs.map((t) => {
                  const Icon = tabMeta[t].icon;
                  return (
                    <TabsTrigger key={t} value={t}>
                      <Icon aria-hidden />
                      {tabMeta[t].label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
            {branchList.length > 1 && tab !== "transfers" && tab !== "consumables" && (
              <Select value={branchId} onValueChange={setSelectedBranch}>
                <SelectTrigger aria-label="Chi nhánh" className="h-11 w-full rounded-xl bg-card shadow-card sm:h-10 lg:w-60 *:data-[slot=select-value]:flex-1">
                  <Store className="text-muted-foreground" aria-hidden />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branchList.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <TabsContent value="stock" className="pt-5">
            {tab === "stock" && <StockSection ctx={ctx} />}
          </TabsContent>
          <TabsContent value="movements" className="pt-5">
            {tab === "movements" && <MovementsSection ctx={ctx} />}
          </TabsContent>
          <TabsContent value="purchases" className="pt-5">
            {tab === "purchases" && <PurchasesSection ctx={ctx} />}
          </TabsContent>
          <TabsContent value="transfers" className="pt-5">
            {tab === "transfers" && <TransfersSection ctx={ctx} />}
          </TabsContent>
          <TabsContent value="counts" className="pt-5">
            {tab === "counts" && <CountsSection ctx={ctx} />}
          </TabsContent>
          <TabsContent value="consumables" className="pt-5">
            {tab === "consumables" && <ConsumablesSection ctx={ctx} />}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
