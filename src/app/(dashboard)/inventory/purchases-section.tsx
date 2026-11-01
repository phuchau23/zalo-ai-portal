"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronDown, ChevronRight, CircleAlert, LoaderCircle, PackagePlus, Plus } from "lucide-react";
import { Field } from "@/components/common/field";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { call, type ApiResult } from "@/lib/api/call";
import { api, type PurchaseOrder, type Supplier } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { emptyToNull } from "@/lib/crm";
import { formatDateTime, formatMoney } from "@/lib/format";
import { purchaseStatusOf, purchaseTotal } from "@/lib/inventory";
import { formatQty } from "@/lib/sales";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import type { InventoryContext } from "./inventory-page";
import { ProductLinesEditor, stockHint, type ProductLine } from "./product-lines";

const NONE = "__none__";

/** Phiếu nhập hàng của chi nhánh: danh sách (mở rộng xem dòng), tạo phiếu, nhận / hủy phiếu nháp. */
export function PurchasesSection({ ctx }: { ctx: InventoryContext }) {
  const { branchId, canEdit, version, onChanged } = ctx;
  const { data, problem, reload } = useApiData(() => call(() => api.GET("/inventory/purchase-orders", { params: { query: { branchId, limit: 100 } } })));
  const suppliers = useApiData(() => call(() => api.GET("/inventory/suppliers")));
  useEffect(() => {
    reload();
  }, [branchId, version, reload]);

  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionProblem, setActionProblem] = useState<ApiProblem | null>(null);

  async function act(id: string, request: () => Promise<ApiResult<unknown>>) {
    setActionProblem(null);
    setBusyId(id);
    const result = await request();
    setBusyId(null);
    if (!result.ok) setActionProblem(result.problem);
    reload();
    onChanged();
  }

  const rows = useMemo(() => [...(data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [data]);

  return (
    <div className="flex flex-col gap-3">
      {canEdit && (
        <div className="flex justify-end">
          <Button className="h-11 sm:h-9" onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            Tạo phiếu nhập
          </Button>
        </div>
      )}

      {actionProblem && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(actionProblem)}
        </p>
      )}

      {problem && !data ? (
        <ErrorState problem={problem} onRetry={reload} />
      ) : !data ? (
        <LoadingRows rows={4} columns={4} label="Đang tải phiếu nhập" />
      ) : rows.length === 0 ? (
        <EmptyState icon={PackagePlus} title="Chưa có phiếu nhập" description="Tạo phiếu nhập khi hàng về: chọn nhà cung cấp, sản phẩm, số lượng và giá vốn.">
          {canEdit && (
            <Button className="h-11 sm:h-9" onClick={() => setCreating(true)}>
              <Plus aria-hidden />
              Tạo phiếu nhập
            </Button>
          )}
        </EmptyState>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {rows.map((po) => {
            const expanded = open === po.id;
            const st = purchaseStatusOf(po.status);
            const busy = busyId === po.id;
            return (
              <li key={po.id} className="flex flex-col">
                <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : po.id)}
                    aria-expanded={expanded}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:min-h-0"
                  >
                    {expanded ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                    <span className="flex min-w-0 flex-col">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        <span className="font-mono">PN-{String(po.number).padStart(4, "0")}</span>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {po.supplierName ?? "Không ghi NCC"} · {po.lines.length} dòng · {formatDateTime(po.receivedAt ?? po.createdAt)}
                      </span>
                    </span>
                  </button>
                  <span className="tabular font-medium sm:w-32 sm:text-right">{formatMoney(po.total)}</span>
                  {canEdit && po.status === "draft" && (
                    <div className="flex gap-2">
                      <Button size="sm" className="h-11 sm:h-8" disabled={busy} onClick={() => void act(po.id, () => call(() => api.POST("/inventory/purchase-orders/{orderId}/receive", { params: { path: { orderId: po.id } } })))}>
                        {busy && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
                        Nhận hàng
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-8"
                        disabled={busy}
                        onClick={() => void act(po.id, () => call(() => api.POST("/inventory/purchase-orders/{orderId}/cancel", { params: { path: { orderId: po.id } } })))}
                      >
                        Hủy
                      </Button>
                    </div>
                  )}
                </div>
                {expanded && (
                  <div className="flex flex-col gap-2 border-t bg-muted/30 px-3 py-3 text-sm">
                    <ul className="flex flex-col divide-y rounded-md border bg-background">
                      {po.lines.map((l) => (
                        <li key={l.catalogItemId} className="flex items-center gap-3 px-3 py-2">
                          <span className="min-w-0 flex-1 truncate">{l.name}</span>
                          <span className="tabular text-muted-foreground">
                            {formatQty(l.quantity)} × {formatMoney(l.unitCost)}
                          </span>
                          <span className="tabular w-28 text-right font-medium">{formatMoney(l.quantity * l.unitCost)}</span>
                        </li>
                      ))}
                    </ul>
                    {po.note && <p className="text-muted-foreground">{po.note}</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {creating && (
        <PurchaseDialog
          ctx={ctx}
          suppliers={suppliers.data ?? []}
          onSupplierAdded={suppliers.reload}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            reload();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function PurchaseDialog({
  ctx,
  suppliers,
  onSupplierAdded,
  onClose,
  onSaved,
}: {
  ctx: InventoryContext;
  suppliers: Supplier[];
  onSupplierAdded: () => void;
  onClose: () => void;
  onSaved: (order: PurchaseOrder) => void;
}) {
  const { branchId, products } = ctx;
  const levels = useApiData(() => call(() => api.GET("/inventory/levels", { params: { query: { branchId } } })));
  const [supplierId, setSupplierId] = useState<string>(NONE);
  const [lines, setLines] = useState<ProductLine[]>([]);
  const [note, setNote] = useState("");
  const [receiveNow, setReceiveNow] = useState(true);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const [addingSupplier, setAddingSupplier] = useState(false);
  const errors = problem?.fieldErrors ?? {};

  const total = purchaseTotal(lines.map((l) => ({ quantity: Number(l.quantity) || 0, unitCost: Number(l.unitCost) || 0 })));
  const valid = lines.length > 0 && lines.every((l) => (Number(l.quantity) || 0) > 0 && l.unitCost.trim() !== "" && Number(l.unitCost) >= 0);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setProblem(null);
    const result = await call(() =>
      api.POST("/inventory/purchase-orders", {
        body: {
          branchId,
          supplierId: supplierId === NONE ? null : supplierId,
          lines: lines.map((l) => ({ catalogItemId: l.catalogItemId, quantity: Number(l.quantity) || 0, unitCost: Math.max(0, Math.trunc(Number(l.unitCost) || 0)) })),
          note: emptyToNull(note),
          receiveNow,
        },
      }),
    );
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    onSaved(result.data);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tạo phiếu nhập</DialogTitle>
          <DialogDescription>Giá vốn bình quân của sản phẩm được tính lại khi nhận hàng.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-5">
          {problem && !Object.keys(errors).length && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>{problemMessage(problem)}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-end gap-2">
              <Field id="po-supplier" label="Nhà cung cấp" error={errors.supplierId} className="min-w-0 flex-1">
                <Select value={supplierId} onValueChange={setSupplierId} disabled={saving}>
                  <SelectTrigger id="po-supplier" className="h-11 w-full sm:h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Không ghi</SelectItem>
                    {suppliers
                      .filter((s) => s.isActive || s.id === supplierId)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </Field>
              <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={saving} onClick={() => setAddingSupplier((v) => !v)}>
                <Plus aria-hidden />
                Thêm NCC
              </Button>
            </div>
            {addingSupplier && (
              <SupplierForm
                onAdded={(s) => {
                  setAddingSupplier(false);
                  onSupplierAdded();
                  setSupplierId(s.id);
                }}
                onCancel={() => setAddingSupplier(false)}
              />
            )}
          </div>

          <ProductLinesEditor idPrefix="po" products={products} lines={lines} onChange={setLines} withCost disabled={saving} errors={errors} hint={(id) => stockHint(levels.data, id)} />

          <Field id="po-note" label="Ghi chú" error={errors.note}>
            <Textarea id="po-note" rows={2} maxLength={500} value={note} disabled={saving} onChange={(e) => setNote(e.target.value)} placeholder="Số hóa đơn NCC, điều kiện thanh toán..." />
          </Field>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Label htmlFor="po-receive" className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-normal sm:min-h-9">
              <Checkbox id="po-receive" checked={receiveNow} disabled={saving} onCheckedChange={(v) => setReceiveNow(v === true)} />
              <span className="flex flex-col">
                <span className="font-medium">Nhận hàng ngay</span>
                <span className="text-xs text-muted-foreground">Bỏ chọn để lưu nháp, nhận sau khi hàng về.</span>
              </span>
            </Label>
            <p className="text-sm">
              Tổng: <span className="tabular font-semibold">{formatMoney(total)}</span>
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={saving} onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" className="h-11 sm:h-9" disabled={saving || !valid}>
              {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
              {saving ? "Đang lưu..." : receiveNow ? "Nhập kho" : "Lưu nháp"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SupplierForm({ onAdded, onCancel }: { onAdded: (s: Supplier) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const errors = problem?.fieldErrors ?? {};

  async function save() {
    setSaving(true);
    setProblem(null);
    const result = await call(() => api.POST("/inventory/suppliers", { body: { name: name.trim(), phone: emptyToNull(phone), note: null, isActive: true } }));
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    onAdded(result.data);
  }

  return (
    <div className={cn("flex flex-col gap-3 rounded-md border p-3")}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field id="sup-name" label="Tên nhà cung cấp" error={errors.name}>
          <Input id="sup-name" value={name} maxLength={200} required disabled={saving} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(errors.name)} className="h-11 sm:h-9" />
        </Field>
        <Field id="sup-phone" label="Số điện thoại" error={errors.phone}>
          <Input id="sup-phone" type="tel" inputMode="tel" value={phone} maxLength={20} disabled={saving} onChange={(e) => setPhone(e.target.value)} aria-invalid={Boolean(errors.phone)} className="h-11 sm:h-9" />
        </Field>
      </div>
      {problem && !Object.keys(errors).length && (
        <p role="alert" className="text-sm text-destructive">
          {problemMessage(problem)}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="button" size="sm" className="h-11 sm:h-8" disabled={saving || !name.trim()} onClick={() => void save()}>
          {saving ? "Đang lưu..." : "Lưu NCC"}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-11 sm:h-8" disabled={saving} onClick={onCancel}>
          Bỏ
        </Button>
      </div>
    </div>
  );
}
