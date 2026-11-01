"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Boxes, Check, CircleAlert, LoaderCircle, Pencil, SlidersHorizontal, X } from "lucide-react";
import { Field } from "@/components/common/field";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { call } from "@/lib/api/call";
import { api, type StockLevel } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { formatMoney } from "@/lib/format";
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

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Label htmlFor="stock-low" className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-normal sm:min-h-0">
          <Checkbox id="stock-low" checked={lowOnly} onCheckedChange={(v) => setLowOnly(v === true)} />
          Chỉ hiện sắp hết {lowCount > 0 && <span className="tabular text-muted-foreground">({lowCount})</span>}
        </Label>
      </div>

      {actionProblem && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(actionProblem)}
        </p>
      )}

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
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sản phẩm</TableHead>
                <TableHead className="hidden sm:table-cell">SKU</TableHead>
                <TableHead className="text-right">Tồn</TableHead>
                <TableHead className="text-right">Tối thiểu</TableHead>
                <TableHead className="hidden text-right md:table-cell">Giá vốn BQ</TableHead>
                <TableHead className="hidden text-right lg:table-cell">Giá trị tồn</TableHead>
                {canEdit && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.catalogItemId} className={cn(r.low && "bg-warning/5")}>
                  <TableCell className="whitespace-normal">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                      {r.name}
                      {r.low && <Badge variant="warning">Sắp hết</Badge>}
                    </div>
                    {r.sku && <div className="text-xs text-muted-foreground sm:hidden">{r.sku}</div>}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">{r.sku ?? "—"}</TableCell>
                  <TableCell className={cn("tabular text-right font-medium", r.quantity < 0 && "text-destructive")}>
                    {formatQty(r.quantity)}
                    {r.unit && <span className="font-normal text-muted-foreground"> {r.unit}</span>}
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
                        className={cn("inline-flex min-h-9 items-center gap-1 rounded-sm px-1 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none", canEdit && "hover:bg-muted")}
                        title={canEdit ? "Đặt mức tối thiểu" : undefined}
                      >
                        {r.minQuantity === null ? <span className="text-muted-foreground">—</span> : formatQty(r.minQuantity)}
                        {canEdit && <Pencil className="size-3 text-muted-foreground" aria-hidden />}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="tabular hidden text-right md:table-cell">{formatMoney(r.avgCost)}</TableCell>
                  <TableCell className="tabular hidden text-right text-muted-foreground lg:table-cell">{formatMoney(Math.round(r.quantity * r.avgCost))}</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="h-9" onClick={() => setAdjusting(r)}>
                        <SlidersHorizontal aria-hidden />
                        Điều chỉnh
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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
        <DialogHeader>
          <DialogTitle>Điều chỉnh tồn: {level.name}</DialogTitle>
          <DialogDescription>
            Đang tồn {formatQty(level.quantity)}
            {level.unit ? ` ${level.unit}` : ""}. Nhập số dương để cộng, số âm để trừ (hỏng, mất, tặng...).
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
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
