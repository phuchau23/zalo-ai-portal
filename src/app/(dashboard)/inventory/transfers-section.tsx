"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeftRight, ArrowRight, CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { Field } from "@/components/common/field";
import { SectionHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { emptyToNull } from "@/lib/crm";
import { useApiData } from "@/lib/use-api-data";
import type { InventoryContext } from "./inventory-page";
import { ProductLinesEditor, stockHint, type ProductLine } from "./product-lines";

/** Chuyển hàng giữa hai chi nhánh: trừ kho nơi đi, cộng kho nơi đến (ghi hai dòng lịch sử). */
export function TransfersSection({ ctx }: { ctx: InventoryContext }) {
  const { branches, products, canEdit, branchId, onChanged } = ctx;
  const [fromId, setFromId] = useState(branchId);
  const [toId, setToId] = useState(() => branches.find((b) => b.id !== branchId)?.id ?? "");
  const [lines, setLines] = useState<ProductLine[]>([]);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const errors = problem?.fieldErrors ?? {};

  const levels = useApiData(() => (fromId ? call(() => api.GET("/inventory/levels", { params: { query: { branchId: fromId } } })) : Promise.resolve({ ok: true as const, data: [] })));
  useEffect(() => {
    levels.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromId]);

  if (branches.length < 2) {
    return <EmptyState icon={ArrowLeftRight} title="Cần ít nhất 2 chi nhánh" description="Chuyển kho dùng khi doanh nghiệp có nhiều chi nhánh. Thêm chi nhánh ở Cài đặt." />;
  }
  if (!canEdit) {
    return <EmptyState icon={ArrowLeftRight} title="Cần quyền “Quản lý kho”" description="Bạn chỉ xem được tồn và lịch sử; chuyển kho do người có quyền quản lý kho thực hiện." />;
  }

  const valid = fromId && toId && fromId !== toId && lines.length > 0 && lines.every((l) => (Number(l.quantity) || 0) > 0);
  const nameOf = (id: string) => branches.find((b) => b.id === id)?.name ?? "";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setProblem(null);
    setDone(null);
    const result = await call(() =>
      api.POST("/inventory/transfers", {
        body: { fromBranchId: fromId, toBranchId: toId, lines: lines.map((l) => ({ catalogItemId: l.catalogItemId, quantity: Number(l.quantity) || 0 })), note: emptyToNull(note) },
      }),
    );
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    setDone(`Đã chuyển ${lines.length} sản phẩm từ ${nameOf(fromId)} sang ${nameOf(toId)}.`);
    setLines([]);
    setNote("");
    levels.reload();
    onChanged();
  }

  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="surface flex max-w-3xl flex-col gap-5 rounded-2xl p-4 sm:p-6">
      <SectionHeader icon={ArrowLeftRight} title="Chuyển hàng giữa chi nhánh" description="Trừ kho nơi đi, cộng kho nơi đến; lịch sử ghi lại ở cả hai chi nhánh." />
      {problem && !Object.keys(errors).length && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{problemMessage(problem)}</AlertDescription>
        </Alert>
      )}
      {done && (
        <p role="status" className="flex items-center gap-1.5 rounded-xl border border-success/25 bg-success/5 px-3 py-2 text-sm text-success">
          <CircleCheck className="size-4" aria-hidden />
          {done}
        </p>
      )}

      <div className="grid gap-4 rounded-2xl border bg-muted/30 p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <Field id="tr-from" label="Từ chi nhánh" error={errors.fromBranchId}>
          <Select value={fromId} onValueChange={setFromId} disabled={saving}>
            <SelectTrigger id="tr-from" className="h-11 w-full bg-background sm:h-9" aria-invalid={Boolean(errors.fromBranchId)}>
              <SelectValue placeholder="Chọn" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <span className="hidden size-9 items-center justify-center rounded-full bg-active-gradient text-white shadow-glow sm:mb-0.5 sm:flex" aria-hidden>
          <ArrowRight className="size-4" />
        </span>
        <Field id="tr-to" label="Đến chi nhánh" error={errors.toBranchId ?? (fromId && fromId === toId ? "Chọn chi nhánh khác nơi đi." : undefined)}>
          <Select value={toId} onValueChange={setToId} disabled={saving}>
            <SelectTrigger id="tr-to" className="h-11 w-full bg-background sm:h-9" aria-invalid={Boolean(errors.toBranchId) || (Boolean(fromId) && fromId === toId)}>
              <SelectValue placeholder="Chọn" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <ProductLinesEditor idPrefix="tr" products={products} lines={lines} onChange={setLines} disabled={saving} errors={errors} hint={(id) => stockHint(levels.data, id)} />

      <Field id="tr-note" label="Ghi chú" error={errors.note}>
        <Textarea id="tr-note" rows={2} maxLength={500} value={note} disabled={saving} onChange={(e) => setNote(e.target.value)} />
      </Field>

      <Button type="submit" className="h-11 w-fit sm:h-9" disabled={saving || !valid}>
        {saving ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <ArrowLeftRight aria-hidden />}
        {saving ? "Đang chuyển..." : "Chuyển kho"}
      </Button>
    </form>
  );
}
