"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronDown, ChevronRight, CircleAlert, ClipboardCheck, LoaderCircle, Plus } from "lucide-react";
import { Field } from "@/components/common/field";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { call } from "@/lib/api/call";
import { api, type StockCount } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { emptyToNull } from "@/lib/crm";
import { formatDateTime } from "@/lib/format";
import { countDelta, countStatusOf } from "@/lib/inventory";
import { formatQty } from "@/lib/sales";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import type { InventoryContext } from "./inventory-page";
import { newProductLine, ProductLinesEditor, stockHint, type ProductLine } from "./product-lines";

/** Kiểm kê: đếm thực tế, so với sổ sách, áp dụng chênh lệch vào tồn. */
export function CountsSection({ ctx }: { ctx: InventoryContext }) {
  const { branchId, products, canEdit, version, onChanged } = ctx;
  const { data, problem, reload } = useApiData(() => call(() => api.GET("/inventory/counts", { params: { query: { branchId, limit: 50 } } })));
  useEffect(() => {
    reload();
  }, [branchId, version, reload]);

  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionProblem, setActionProblem] = useState<ApiProblem | null>(null);

  async function apply(id: string) {
    setActionProblem(null);
    setBusyId(id);
    const result = await call(() => api.POST("/inventory/counts/{countId}/apply", { params: { path: { countId: id } } }));
    setBusyId(null);
    if (!result.ok) setActionProblem(result.problem);
    reload();
    onChanged();
  }

  const rows = useMemo(() => [...(data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [data]);
  const nameOf = (id: string) => products.find((p) => p.id === id)?.name ?? "(sản phẩm)";

  return (
    <div className="flex flex-col gap-3">
      {canEdit && (
        <div className="flex justify-end">
          <Button className="h-11 sm:h-9" onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            Kiểm kê mới
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
        <LoadingRows rows={3} columns={4} label="Đang tải kiểm kê" />
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Chưa có đợt kiểm kê" description="Định kỳ đếm hàng thực tế; hệ thống so với sổ sách và điều chỉnh tồn theo số đếm.">
          {canEdit && (
            <Button className="h-11 sm:h-9" onClick={() => setCreating(true)}>
              <Plus aria-hidden />
              Kiểm kê mới
            </Button>
          )}
        </EmptyState>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {rows.map((c) => {
            const expanded = open === c.id;
            const st = countStatusOf(c.status);
            const diffs = c.lines.filter((l) => countDelta(l) !== 0).length;
            const busy = busyId === c.id;
            return (
              <li key={c.id} className="flex flex-col">
                <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : c.id)}
                    aria-expanded={expanded}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:min-h-0"
                  >
                    {expanded ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />}
                    <span className="flex min-w-0 flex-col">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        Kiểm kê {formatDateTime(c.createdAt)}
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {c.lines.length} sản phẩm · {diffs === 0 ? "khớp sổ sách" : `${diffs} lệch`}
                        {c.appliedAt && ` · áp dụng ${formatDateTime(c.appliedAt)}`}
                      </span>
                    </span>
                  </button>
                  {canEdit && c.status === "draft" && (
                    <Button size="sm" className="h-11 sm:h-8" disabled={busy} onClick={() => void apply(c.id)}>
                      {busy && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
                      Áp dụng vào tồn
                    </Button>
                  )}
                </div>
                {expanded && (
                  <div className="flex flex-col gap-2 border-t bg-muted/30 px-3 py-3 text-sm">
                    <ul className="flex flex-col divide-y rounded-md border bg-background">
                      {c.lines.map((l) => {
                        const d = countDelta(l);
                        return (
                          <li key={l.catalogItemId} className="flex items-center gap-3 px-3 py-2">
                            <span className="min-w-0 flex-1 truncate">{nameOf(l.catalogItemId)}</span>
                            <span className="tabular text-muted-foreground">
                              sổ {formatQty(l.expectedQuantity)} · đếm {formatQty(l.countedQuantity)}
                            </span>
                            <span className={cn("tabular w-16 text-right font-medium", d === 0 ? "text-success" : "text-destructive")}>
                              {d === 0 ? "Khớp" : `${d > 0 ? "+" : ""}${formatQty(d)}`}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    {c.note && <p className="text-muted-foreground">{c.note}</p>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {creating && (
        <CountDialog
          ctx={ctx}
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

function CountDialog({ ctx, onClose, onSaved }: { ctx: InventoryContext; onClose: () => void; onSaved: (count: StockCount) => void }) {
  const { branchId, products } = ctx;
  const levels = useApiData(() => call(() => api.GET("/inventory/levels", { params: { query: { branchId } } })));
  const [lines, setLines] = useState<ProductLine[]>([]);
  const [note, setNote] = useState("");
  const [applyNow, setApplyNow] = useState(true);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const errors = problem?.fieldErrors ?? {};

  function addAll() {
    setLines(products.map((p) => newProductLine(p.id, String(levels.data?.find((l) => l.catalogItemId === p.id)?.quantity ?? 0))));
  }

  const valid = lines.length > 0 && lines.every((l) => l.quantity.trim() !== "" && Number(l.quantity) >= 0);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setProblem(null);
    const result = await call(() =>
      api.POST("/inventory/counts", {
        body: { branchId, lines: lines.map((l) => ({ catalogItemId: l.catalogItemId, countedQuantity: Number(l.quantity) || 0 })), note: emptyToNull(note), applyNow },
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
          <DialogTitle>Kiểm kê</DialogTitle>
          <DialogDescription>Chọn sản phẩm và nhập số đếm thực tế. Sản phẩm không chọn giữ nguyên tồn.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-5">
          {problem && !Object.keys(errors).length && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>{problemMessage(problem)}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" className="h-11 sm:h-8" disabled={saving || products.length === 0 || !levels.data} onClick={addAll}>
              Thêm tất cả sản phẩm (điền sẵn số sổ sách)
            </Button>
          </div>
          <ProductLinesEditor idPrefix="ct" products={products} lines={lines} onChange={setLines} quantityLabel="Đếm được" disabled={saving} errors={errors} hint={(id) => stockHint(levels.data, id)} />
          <Field id="ct-note" label="Ghi chú" error={errors.note}>
            <Textarea id="ct-note" rows={2} maxLength={500} value={note} disabled={saving} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Label htmlFor="ct-apply" className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-normal sm:min-h-9">
            <Checkbox id="ct-apply" checked={applyNow} disabled={saving} onCheckedChange={(v) => setApplyNow(v === true)} />
            <span className="flex flex-col">
              <span className="font-medium">Áp dụng vào tồn ngay</span>
              <span className="text-xs text-muted-foreground">Bỏ chọn để lưu nháp và xem chênh lệch trước khi áp dụng.</span>
            </span>
          </Label>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={saving} onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" className="h-11 sm:h-9" disabled={saving || !valid}>
              {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
              {saving ? "Đang lưu..." : applyNow ? "Lưu và áp dụng" : "Lưu nháp"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
