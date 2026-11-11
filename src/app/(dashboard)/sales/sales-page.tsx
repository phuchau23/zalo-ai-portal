"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CircleDollarSign,
  Clock,
  Plus,
  Receipt,
  Ticket,
  TrendingUp,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { FilterLayout, FilterSection } from "@/components/common/filter-layout";
import { FilterPills } from "@/components/common/filter-pills";
import type { Tone } from "@/components/common/icon-tile";
import { MetricTile } from "@/components/common/metric-tile";
import { PageHeader } from "@/components/common/page-header";
import { InvoiceStatusBadge, invoiceStatusLook } from "@/components/common/status-pill";
import { PersonAvatar } from "@/components/common/person-avatar";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type Branch, type InvoiceSummary } from "@/lib/api/client";
import { hasPermission } from "@/lib/crm";
import { formatDateTime, formatMoney } from "@/lib/format";
import { dateRangeToIso, defaultDateRange, invoiceStatusOf, invoiceStatuses, isSalesTab, type SalesTab } from "@/lib/sales";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { CashShiftSection } from "./cash-shift-section";
import { InvoiceDetailDialog } from "./invoice-detail";
import { InvoiceEditorDialog } from "./invoice-editor";
import { VouchersSection } from "./vouchers-section";

const salesTabs: { value: SalesTab; label: string; icon: LucideIcon }[] = [
  { value: "invoices", label: "Hóa đơn", icon: Receipt },
  { value: "shift", label: "Ca thu ngân", icon: Clock },
  { value: "vouchers", label: "Voucher", icon: Ticket },
];

const ALL = "__all__";

/**
 * Bán hàng: hóa đơn (lập, thu tiền), ca thu ngân, voucher. Chi nhánh chọn chung cho các tab.
 * `openNew` (?new=1, nút "Tạo hóa đơn" ở Tổng quan): mở sẵn hộp lập hóa đơn khi đã biết chi nhánh.
 */
export function SalesPage({ initialTab, openNew = false }: { initialTab: SalesTab; openNew?: boolean }) {
  const router = useRouter();
  const { me } = useSession();
  const canEditVouchers = hasPermission(me.currentTenant, "manage_catalog");
  const [tab, setTab] = useState<SalesTab>(initialTab);
  const branches = useApiData(() => call(() => api.GET("/branches", { params: { query: { includeInactive: false } } })));
  const branchList: Branch[] = useMemo(() => branches.data ?? [], [branches.data]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [creating, setCreating] = useState(openNew);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  const branchId = useMemo(() => {
    if (selectedBranch && branchList.some((b) => b.id === selectedBranch)) return selectedBranch;
    const mine = me.currentTenant?.branchId;
    if (mine && branchList.some((b) => b.id === mine)) return mine;
    return branchList.find((b) => b.isDefault)?.id ?? branchList[0]?.id ?? "";
  }, [selectedBranch, branchList, me.currentTenant?.branchId]);

  function changeTab(value: string) {
    if (!isSalesTab(value)) return;
    setTab(value);
    router.replace(`/sales?tab=${value}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Receipt}
        title="Bán hàng"
        description="Lập hóa đơn, thu tiền, mã QR chuyển khoản, đối chiếu ca thu ngân và mã giảm giá."
        help={
          <ul>
            <li>
              <strong>Tạo hóa đơn</strong>: chọn khách, thêm dịch vụ / gói / sản phẩm, rồi thu tiền (tiền mặt, chuyển khoản, thẻ, ví trả trước). Thu thiếu thì hóa đơn ở trạng thái &quot;Thu một phần&quot;.
            </li>
            <li>
              Khách làm từ <strong>lịch hẹn</strong>: mở lịch → <strong>Thanh toán</strong>, hóa đơn tự điền dịch vụ; khách có gói thì tự trừ buổi.
            </li>
            <li>
              <strong>Ca thu ngân</strong>: mở ca đầu ngày với tiền đầu ca, cuối ngày chốt ca để đối chiếu tiền mặt.
            </li>
            <li>
              Mã QR chuyển khoản cần khai báo tài khoản ngân hàng ở <strong>Cài đặt → Thanh toán</strong>.
            </li>
          </ul>
        }
        actions={
          <Button onClick={() => setCreating(true)} className="h-11 sm:h-9" disabled={!branchId}>
            <Plus aria-hidden />
            Tạo hóa đơn
          </Button>
        }
      />

      {branches.problem && !branches.data ? (
        <ErrorState problem={branches.problem} onRetry={branches.reload} />
      ) : !branches.data ? (
        <LoadingRows rows={4} columns={5} label="Đang tải" />
      ) : branchList.length === 0 ? (
        <EmptyState icon={Receipt} title="Chưa có chi nhánh" description="Thêm chi nhánh ở Cài đặt trước khi lập hóa đơn." />
      ) : (
        <Tabs value={tab} onValueChange={changeTab} className="gap-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-full overflow-x-auto [scrollbar-width:none]">
              <TabsList variant="pill">
                {salesTabs.map((t) => (
                  <TabsTrigger key={t.value} value={t.value}>
                    <t.icon aria-hidden />
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            {branchList.length > 1 && tab !== "vouchers" && (
              <Select value={branchId} onValueChange={setSelectedBranch}>
                <SelectTrigger aria-label="Chi nhánh" className="h-11 w-full bg-card shadow-card sm:h-9 sm:w-56">
                  <Building2 className="text-muted-foreground" aria-hidden />
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

          <TabsContent value="invoices" className="pt-5">
            {tab === "invoices" && <InvoicesTab branchId={branchId} multiBranch={branchList.length > 1} version={version} onOpen={setDetailId} onCreate={() => setCreating(true)} />}
          </TabsContent>
          <TabsContent value="shift" className="pt-5">
            {tab === "shift" && branchId && <CashShiftSection branchId={branchId} />}
          </TabsContent>
          <TabsContent value="vouchers" className="pt-5">
            {tab === "vouchers" && <VouchersSection canEdit={canEditVouchers} />}
          </TabsContent>
        </Tabs>
      )}

      {creating && branchId && (
        <InvoiceEditorDialog
          mode={{ kind: "create", preset: { branchId } }}
          onClose={() => setCreating(false)}
          onSaved={(inv) => {
            setCreating(false);
            setVersion((v) => v + 1);
            setDetailId(inv.id);
          }}
        />
      )}
      {detailId && <InvoiceDetailDialog invoiceId={detailId} onClose={() => setDetailId(null)} onChanged={() => setVersion((v) => v + 1)} />}
    </div>
  );
}

function InvoicesTab({
  branchId,
  multiBranch,
  version,
  onOpen,
  onCreate,
}: {
  branchId: string;
  multiBranch: boolean;
  version: number;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  const [defaults] = useState(() => defaultDateRange(30));
  const [range, setRange] = useState(defaults);
  const [status, setStatus] = useState(ALL);
  const iso = dateRangeToIso(range.from, range.to);
  const filtered = range.from !== defaults.from || range.to !== defaults.to || status !== ALL;

  const invoices = useApiData<InvoiceSummary[]>(() =>
    call(() => api.GET("/invoices", { params: { query: { from: iso.from, to: iso.to, branchId: branchId || undefined, status: status === ALL ? undefined : status } } })),
  );
  useEffect(() => {
    invoices.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iso.from, iso.to, branchId, status, version]);

  const rows = useMemo(() => [...(invoices.data ?? [])].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)), [invoices.data]);
  const live = rows.filter((r) => r.status !== "void");
  const sum = live.reduce((s, r) => s + r.total, 0);
  const paid = live.reduce((s, r) => s + r.paidAmount, 0);
  const due = live.reduce((s, r) => s + r.due, 0);
  const statusOptions = [
    { value: ALL, label: "Tất cả", icon: Receipt, tone: "primary" as Tone },
    ...invoiceStatuses.map((s) => ({ value: s as string, label: invoiceStatusOf(s).label, ...invoiceStatusLook[s] })),
  ];

  return (
    <FilterLayout
      onReset={
        filtered
          ? () => {
              setRange(defaults);
              setStatus(ALL);
            }
          : undefined
      }
      filters={
        <>
          <FilterSection label="Từ ngày" htmlFor="inv-from">
            <Input
              id="inv-from"
              type="date"
              value={range.from}
              max={range.to}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              className="h-11 w-full sm:h-9"
            />
          </FilterSection>
          <FilterSection label="Đến ngày" htmlFor="inv-to">
            <Input id="inv-to" type="date" value={range.to} min={range.from} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} className="h-11 w-full sm:h-9" />
          </FilterSection>
          <FilterSection label="Trạng thái">
            <FilterPills label="Lọc theo trạng thái" variant="list" value={status} options={statusOptions} onChange={setStatus} />
          </FilterSection>
        </>
      }
    >
      {invoices.data && rows.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
          <MetricTile label="Doanh thu" hint="Tổng hóa đơn, trừ đã hủy" value={sum} format={formatMoney} icon={TrendingUp} tone="primary" />
          <MetricTile label="Đã thu" hint="Tiền khách đã trả" value={paid} format={formatMoney} icon={Wallet} tone="success" />
          <MetricTile label="Còn nợ" hint="Chưa thu hết" value={due} format={formatMoney} icon={CircleDollarSign} tone={due > 0 ? "warning" : "muted"} highlight />
          <MetricTile label="Hóa đơn" hint="Trong khoảng ngày" value={rows.length} icon={Receipt} tone="muted" />
        </dl>
      )}

      {invoices.problem && !invoices.data ? (
        <ErrorState problem={invoices.problem} onRetry={invoices.reload} />
      ) : !invoices.data ? (
        <LoadingRows rows={5} columns={5} label="Đang tải hóa đơn" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Receipt} title="Không có hóa đơn trong khoảng này" description="Đổi khoảng ngày, bỏ lọc trạng thái, hoặc tạo hóa đơn mới.">
          <Button onClick={onCreate} className="h-11 sm:h-9">
            <Plus aria-hidden />
            Tạo hóa đơn
          </Button>
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Số</TableHead>
                <TableHead>Khách</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Tổng</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Đã thu</TableHead>
                <TableHead className="hidden text-right md:table-cell">Còn nợ</TableHead>
                <TableHead className="hidden lg:table-cell">Ngày</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const voided = r.status === "void";
                return (
                  <TableRow key={r.id} className={cn("cursor-pointer", voided && "text-muted-foreground")} onClick={() => onOpen(r.id)}>
                    <TableCell>
                      <button
                        type="button"
                        className={cn(
                          "inline-flex min-h-6 cursor-pointer items-center rounded-md bg-muted/70 px-2 font-mono text-[13px] font-semibold focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:min-h-11",
                          voided && "line-through",
                        )}
                        onClick={() => onOpen(r.id)}
                      >
                        {r.number}
                      </button>
                      <div className="mt-0.5 text-xs text-muted-foreground tabular lg:hidden">{formatDateTime(r.issuedAt)}</div>
                    </TableCell>
                    <TableCell className="max-w-48">
                      <div className="flex min-w-0 items-center gap-2.5">
                        {r.contactName ? (
                          <PersonAvatar name={r.contactName} size="sm" />
                        ) : (
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden>
                            <UserRound className="size-4" />
                          </span>
                        )}
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate font-medium">{r.contactName ?? <span className="text-muted-foreground">Khách lẻ</span>}</span>
                          {multiBranch && <span className="truncate text-xs text-muted-foreground">{r.branchName}</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="tabular text-right font-semibold">{formatMoney(r.total)}</TableCell>
                    <TableCell className="tabular hidden text-right text-muted-foreground sm:table-cell">{formatMoney(r.paidAmount)}</TableCell>
                    <TableCell className={cn("tabular hidden text-right md:table-cell", r.due > 0 && !voided ? "font-semibold text-warning" : "text-muted-foreground")}>
                      {formatMoney(r.due)}
                    </TableCell>
                    <TableCell className="tabular hidden text-muted-foreground lg:table-cell">{formatDateTime(r.issuedAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between gap-2 border-t bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
            <span className="tabular">{rows.length} hóa đơn</span>
            <span className="tabular">
              Tổng (trừ đã hủy): <span className="font-semibold text-foreground">{formatMoney(sum)}</span>
            </span>
          </div>
        </div>
      )}
    </FilterLayout>
  );
}
