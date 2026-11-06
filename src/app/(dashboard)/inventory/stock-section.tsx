"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { ArrowRight, Boxes, Check, CircleAlert, LoaderCircle, Package, PackageX, Pencil, Search, SearchX, SlidersHorizontal, TriangleAlert, Wallet, X, type LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/components/common/animated-number";
import { Field } from "@/components/common/field";
import { FilterLayout, FilterSection } from "@/components/common/filter-layout";
import { FilterPills } from "@/components/common/filter-pills";
import { IconTile, type Tone } from "@/components/common/icon-tile";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { call } from "@/lib/api/call";
import { api, type StockLevel } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { formatMoney } from "@/lib/format";
import { fadeUp, stagger } from "@/lib/motion";
import { formatQty, parseQty } from "@/lib/sales";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import type { InventoryContext } from "./inventory-page";

const collator = new Intl.Collator("vi");

/** Tồn kho một chi nhánh: số lượng, mức tối thiểu (sửa tại chỗ), giá vốn bình quân, điều chỉnh tay. */
export function StockSection({ ctx }: { ctx: InventoryContext }) {
  const { branchId, canEdit, version, onChanged } = ctx;
  const [lowOnly, setLowOnly] = useState(false);
  const { data, problem, reload } = useApiData(() => call(() => api.GET("/inventory/levels", { params: { query: { branchId, lowOnly } } })));
  useEffect(() => {
    reload();
  }, [branchId, lowOnly, version, reload]);

  const [editingMin, setEditingMin] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState<StockLevel | null>(null);
  const [actionProblem, setActionProblem] = useState<ApiProblem | null>(null);

  const rows = useMemo(() => [...(data ?? [])].sort((a, b) => Number(b.low) - Number(a.low) || collator.compare(a.name, b.name)), [data]);
  const lowCount = rows.filter((r) => r.low).length;
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q) || (r.sku ?? "").toLowerCase().includes(q)) : rows;
  }, [rows, query]);

  const outCount = rows.filter((r) => r.quantity <= 0).length;
  const stockValue = rows.reduce((sum, r) => sum + Math.max(0, Math.round(r.quantity * r.avgCost)), 0);

  return (
    <div className="flex flex-col gap-4">
      {data && !lowOnly && rows.length > 0 && (
        <motion.ul variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Tóm tắt tồn kho">
          <StatTile icon={Boxes} tone="primary" label="Sản phẩm theo dõi" value={rows.length} />
          <StatTile icon={TriangleAlert} tone="warning" label="Sắp hết" value={lowCount} hint={lowCount > 0 ? "Dưới mức tối thiểu" : "Đủ hàng"} />
          <StatTile icon={PackageX} tone="destructive" label="Hết hàng" value={outCount} hint={outCount > 0 ? "Tồn bằng 0 hoặc âm" : "Không có"} />
          <StatTile icon={Wallet} tone="success" label="Giá trị tồn" value={stockValue} format={formatMoney} hint="Theo giá vốn bình quân" />
        </motion.ul>
      )}

      {actionProblem && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(actionProblem)}
        </p>
      )}

      <FilterLayout
        onReset={
          lowOnly || query.trim()
            ? () => {
                setLowOnly(false);
                setQuery("");
              }
            : undefined
        }
        filters={
          <>
            <FilterSection label="Tìm sản phẩm" htmlFor="stock-search">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="stock-search"
                  type="search"
                  className="h-11 rounded-xl pl-9 sm:h-9"
                  placeholder="Tên hoặc mã SKU"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </FilterSection>
            <FilterSection label="Mức tồn">
              <FilterPills
                variant="list"
                label="Lọc theo mức tồn"
                value={lowOnly ? "low" : "all"}
                onChange={(v) => setLowOnly(v === "low")}
                options={[
                  { value: "all", label: "Tất cả sản phẩm", icon: Boxes, tone: "primary" },
                  { value: "low", label: "Sắp hết", count: lowCount, alert: true, icon: TriangleAlert, tone: "warning" },
                ]}
              />
            </FilterSection>
            {canEdit && (
              <p className="text-xs text-pretty text-muted-foreground">
                Bấm số ở cột <strong className="font-medium text-foreground">Tối thiểu</strong> để đặt mức cảnh báo &quot;Sắp hết&quot; cho từng sản phẩm.
              </p>
            )}
          </>
        }
      >
        {problem && !data ? (
          <ErrorState problem={problem} onRetry={reload} />
        ) : !data ? (
          <LoadingRows rows={5} columns={5} label="Đang tải tồn kho" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={lowOnly ? "Không có sản phẩm sắp hết" : "Chưa có tồn kho"}
            description={lowOnly ? "Mọi sản phẩm đều trên mức tối thiểu." : "Nhập hàng ở tab Nhập hàng, hoặc bật “Theo dõi kho” cho sản phẩm trong Danh mục."}
          />
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border bg-card shadow-card">
            <EmptyState icon={SearchX} title="Không có sản phẩm khớp" description={`Không có sản phẩm nào có tên hoặc SKU chứa “${query.trim()}”.`} compact />
          </div>
        ) : (
            <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sản phẩm</TableHead>
                    <TableHead className="text-right">Tồn</TableHead>
                    <TableHead className="text-right">Tối thiểu</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Giá vốn BQ</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">Giá trị tồn</TableHead>
                    {canEdit && <TableHead className="w-12 sm:w-32" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((r) => {
                    const out = r.quantity <= 0;
                    const meter = r.minQuantity ? Math.max(4, Math.min(100, (r.quantity / (r.minQuantity * 2)) * 100)) : null;
                    return (
                      <TableRow key={r.catalogItemId} className={cn(r.low && "bg-warning/[0.05] hover:bg-warning/10")}>
                        <TableCell className={cn("min-w-[11rem] whitespace-normal", r.low && "shadow-[inset_3px_0_0_var(--warning)]")}>
                          <div className="flex items-center gap-3">
                            <IconTile icon={out ? PackageX : Package} tone={out ? "destructive" : r.low ? "warning" : "primary"} size="sm" />
                            <div className="flex min-w-0 flex-col gap-0.5">
                              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                                {r.name}
                                {r.low && <Badge variant="warning">Sắp hết</Badge>}
                              </span>
                              {r.sku && <code className="w-fit rounded bg-muted px-1 font-mono text-[11px] text-muted-foreground">{r.sku}</code>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn("tabular font-semibold", r.quantity < 0 && "text-destructive")}>
                            {formatQty(r.quantity)}
                            {r.unit && <span className="font-normal text-muted-foreground"> {r.unit}</span>}
                          </span>
                          {meter !== null && (
                            <span className="mt-1.5 ml-auto block h-1 w-16 overflow-hidden rounded-full bg-muted" aria-hidden>
                              <span className={cn("block h-full rounded-full", r.low ? "bg-warning" : "bg-success")} style={{ width: `${meter}%` }} />
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="tabular text-right">
                          {editingMin === r.catalogItemId ? (
                            <MinimumEditor
                              level={r}
                              branchId={branchId}
                              onDone={() => {
                                setEditingMin(null);
                                reload();
                              }}
                              onCancel={() => setEditingMin(null)}
                              onProblem={setActionProblem}
                            />
                          ) : (
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setEditingMin(r.catalogItemId)}
                              className={cn(
                                "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                                canEdit && "cursor-pointer border border-dashed border-transparent hover:border-border hover:bg-background",
                              )}
                              title={canEdit ? "Đặt mức tối thiểu" : undefined}
                              aria-label={canEdit ? `Mức tối thiểu của ${r.name}: ${r.minQuantity === null ? "chưa đặt" : formatQty(r.minQuantity)}. Bấm để sửa` : undefined}
                            >
                              {r.minQuantity === null ? <span className="text-muted-foreground">—</span> : formatQty(r.minQuantity)}
                              {canEdit && <Pencil className="size-3 text-muted-foreground" aria-hidden />}
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="tabular hidden text-right text-muted-foreground md:table-cell">{formatMoney(r.avgCost)}</TableCell>
                        <TableCell className="tabular hidden text-right font-medium lg:table-cell">{formatMoney(Math.round(r.quantity * r.avgCost))}</TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="h-11 sm:h-8" onClick={() => setAdjusting(r)} aria-label={`Điều chỉnh tồn ${r.name}`}>
                              <SlidersHorizontal aria-hidden />
                              <span className="hidden sm:inline">Điều chỉnh</span>
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
        )}
      </FilterLayout>

      {adjusting && (
        <AdjustDialog
          level={adjusting}
          branchId={branchId}
          onClose={() => setAdjusting(null)}
          onDone={() => {
            setAdjusting(null);
            reload();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

/** Ô số liệu tóm tắt trên đầu bảng tồn (số chạy khi tải xong). */
function StatTile({
  icon,
  tone,
  label,
  value,
  hint,
  format,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: number;
  hint?: string;
  format?: (n: number) => string;
}) {
  return (
    <motion.li variants={fadeUp} className="surface flex min-w-0 flex-col gap-2 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <IconTile icon={icon} tone={tone} size="sm" />
      </div>
      <AnimatedNumber value={value} format={format} className="text-xl font-bold tracking-tight break-words sm:text-2xl" />
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </motion.li>
  );
}

function MinimumEditor({
  level,
  branchId,
  onDone,
  onCancel,
  onProblem,
}: {
  level: StockLevel;
  branchId: string;
  onDone: () => void;
  onCancel: () => void;
  onProblem: (p: ApiProblem | null) => void;
}) {
  const [value, setValue] = useState(level.minQuantity === null ? "" : String(level.minQuantity));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    onProblem(null);
    const result = await call(() => api.PUT("/inventory/minimum", { body: { branchId, catalogItemId: level.catalogItemId, minQuantity: parseQty(value) } }));
    setSaving(false);
    if (!result.ok) return onProblem(result.problem);
    onDone();
  }

  return (
    <form
      className="flex items-center justify-end gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        step="any"
        value={value}
        autoFocus
        disabled={saving}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
        aria-label={`Mức tối thiểu của ${level.name}`}
        placeholder="Bỏ"
        className="h-9 w-20 text-right"
      />
      <Button type="submit" size="icon-sm" variant="ghost" className="size-9" aria-label="Lưu" disabled={saving}>
        {saving ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Check aria-hidden />}
      </Button>
      <Button type="button" size="icon-sm" variant="ghost" className="size-9" aria-label="Hủy" disabled={saving} onClick={onCancel}>
        <X aria-hidden />
      </Button>
    </form>
  );
}

function AdjustDialog({ level, branchId, onClose, onDone }: { level: StockLevel; branchId: string; onClose: () => void; onDone: () => void }) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const errors = problem?.fieldErrors ?? {};
  const d = parseQty(delta);
  const after = d === null ? null : level.quantity + d;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (d === null || d === 0) return;
    setSaving(true);
    setProblem(null);
    const result = await call(() => api.POST("/inventory/adjust", { body: { branchId, catalogItemId: level.catalogItemId, delta: d, reason: reason.trim() } }));
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    onDone();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex-row items-center gap-3 text-left">
          <IconTile icon={SlidersHorizontal} variant="solid" size="md" />
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle>Điều chỉnh tồn: {level.name}</DialogTitle>
            <DialogDescription>Nhập số dương để cộng, số âm để trừ (hỏng, mất, tặng...).</DialogDescription>
          </div>
        </DialogHeader>
        <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
          <div className="flex items-center justify-center gap-5 rounded-2xl border bg-muted/30 p-4" aria-hidden>
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xs text-muted-foreground">Hiện tại</span>
              <span className="tabular text-2xl font-bold">{formatQty(level.quantity)}</span>
            </div>
            <ArrowRight className="size-5 text-muted-foreground" />
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xs text-muted-foreground">Sau điều chỉnh</span>
              <span
                className={cn(
                  "tabular text-2xl font-bold transition-colors",
                  after === null || d === 0 ? "text-muted-foreground" : after < 0 ? "text-destructive" : (d ?? 0) > 0 ? "text-success" : "text-warning",
                )}
              >
                {after === null ? "—" : formatQty(after)}
              </span>
            </div>
            {level.unit && <span className="self-end pb-1 text-xs text-muted-foreground">{level.unit}</span>}
          </div>
          <Field id="adj-delta" label="Thay đổi (+/−)" hint={after === null ? undefined : `Sau điều chỉnh: ${formatQty(after)}`} error={errors.delta}>
            <Input
              id="adj-delta"
              type="number"
              inputMode="decimal"
              step="any"
              value={delta}
              disabled={saving}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="-2"
              aria-invalid={Boolean(errors.delta)}
              className="h-11 sm:h-9"
            />
          </Field>
          <Field id="adj-reason" label="Lý do" error={errors.reason}>
            <Textarea id="adj-reason" rows={2} maxLength={500} value={reason} disabled={saving} onChange={(e) => setReason(e.target.value)} placeholder="Vỡ 2 chai khi vận chuyển" aria-invalid={Boolean(errors.reason)} />
          </Field>
          {problem && !Object.keys(errors).length && (
            <p role="alert" className="text-sm text-destructive">
              {problemMessage(problem)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={saving} onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" className="h-11 sm:h-9" disabled={saving || d === null || d === 0 || !reason.trim()}>
              {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
              {saving ? "Đang lưu..." : "Điều chỉnh"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
