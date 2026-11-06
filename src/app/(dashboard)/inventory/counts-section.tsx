"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { ChevronDown, CircleAlert, ClipboardCheck, ListPlus, LoaderCircle, Plus } from "lucide-react";
import { Field } from "@/components/common/field";
import { IconTile } from "@/components/common/icon-tile";
import { SectionHeader } from "@/components/common/page-header";
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
import { fadeUp, stagger } from "@/lib/motion";
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
      <SectionHeader
        icon={ClipboardCheck}
        title="Các đợt kiểm kê"
        description="Đếm hàng thực tế, so với sổ sách; áp dụng để tồn trên máy khớp kho thật."
        actions={
          canEdit &&
          rows.length > 0 && (
            <Button className="h-11 sm:h-9" onClick={() => setCreating(true)}>
              <Plus aria-hidden />
              Kiểm kê mới
            </Button>
          )
        }
      />

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
        <motion.ul variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-3">
          {rows.map((c) => {
            const expanded = open === c.id;
            const st = countStatusOf(c.status);
            const diffs = c.lines.filter((l) => countDelta(l) !== 0).length;
            const busy = busyId === c.id;
            return (
              <motion.li key={c.id} variants={fadeUp} className={cn("flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card transition-shadow", expanded && "shadow-card-hover")}>
                <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:px-4">
                  <button
                    type="button"
                    onClick={() => setOpen(expanded ? null : c.id)}
                    aria-expanded={expanded}
                    className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:min-h-0"
                  >
                    <IconTile icon={ClipboardCheck} tone={c.status === "applied" ? "success" : "warning"} size="md" />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        Kiểm kê {formatDateTime(c.createdAt)}
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {c.lines.length} sản phẩm
                        {c.appliedAt && ` · áp dụng ${formatDateTime(c.appliedAt)}`}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex",
                        diffs === 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {diffs === 0 ? "Khớp sổ sách" : `${diffs} sản phẩm lệch`}
                    </span>
                    <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none", expanded && "rotate-180")} aria-hidden />
                  </button>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold sm:hidden", diffs === 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
                      {diffs === 0 ? "Khớp sổ sách" : `${diffs} sản phẩm lệch`}
                    </span>
                    {canEdit && c.status === "draft" && (
                      <Button size="sm" className="h-11 sm:h-8" disabled={busy} onClick={() => void apply(c.id)}>
                        {busy && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
                        Áp dụng vào tồn
                      </Button>
                    )}
                  </div>
                </div>
                {expanded && (
                  <div className="flex flex-col gap-2 border-t bg-muted/30 px-3 py-3 text-sm sm:px-4">
                    <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-background">
                      {c.lines.map((l) => {
                        const d = countDelta(l);
                        return (
                          <li key={l.catalogItemId} className="flex items-center gap-3 px-3 py-2.5">
                            <span className="min-w-0 flex-1 truncate font-medium">{nameOf(l.catalogItemId)}</span>
                            <span className="tabular text-xs text-muted-foreground sm:text-sm">
                              sổ {formatQty(l.expectedQuantity)} · đếm {formatQty(l.countedQuantity)}
                            </span>
                            <span
                              className={cn(
                                "tabular w-16 rounded-full px-2 py-0.5 text-center text-xs font-semibold",
                                d === 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                              )}
                            >
                              {d === 0 ? "Khớp" : `${d > 0 ? "+" : ""}${formatQty(d)}`}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    {c.note && <p className="text-muted-foreground">{c.note}</p>}
                  </div>
                )}
              </motion.li>
            );
          })}
        </motion.ul>
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
        <DialogHeader className="flex-row items-center gap-3 text-left">
          <IconTile icon={ClipboardCheck} variant="solid" size="md" />
          <div className="flex min-w-0 flex-col gap-1">
            <DialogTitle>Kiểm kê</DialogTitle>
            <DialogDescription>Chọn sản phẩm và nhập số đếm thực tế. Sản phẩm không chọn giữ nguyên tồn.</DialogDescription>
          </div>
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
              <ListPlus aria-hidden />
              Thêm tất cả sản phẩm (điền sẵn số sổ sách)
            </Button>
          </div>
          <ProductLinesEditor idPrefix="ct" products={products} lines={lines} onChange={setLines} quantityLabel="Đếm được" disabled={saving} errors={errors} hint={(id) => stockHint(levels.data, id)} />
          <Field id="ct-note" label="Ghi chú" error={errors.note}>
            <Textarea id="ct-note" rows={2} maxLength={500} value={note} disabled={saving} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Label htmlFor="ct-apply" className="flex min-h-11 cursor-pointer items-center gap-2 rounded-2xl border bg-muted/30 p-3 text-sm font-normal">
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
