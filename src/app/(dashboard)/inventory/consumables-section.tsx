"use client";

import { useState, type FormEvent } from "react";
import { CircleAlert, CircleCheck, LoaderCircle, Plus, Scissors, Trash2 } from "lucide-react";
import { Field } from "@/components/common/field";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { call } from "@/lib/api/call";
import { api, type Consumable } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { useApiData } from "@/lib/use-api-data";
import type { InventoryContext } from "./inventory-page";

/** Mỗi sản phẩm chỉ một dòng nên `productId` là khóa. */
type Row = { productId: string; quantity: string };

function toRows(items: Consumable[]): Row[] {
  return items.map((c) => ({ productId: c.productId, quantity: String(c.quantityPerSession) }));
}

/** Định mức tiêu hao: mỗi dịch vụ dùng bao nhiêu sản phẩm/vật tư một buổi; hoàn thành lịch hẹn thì tự trừ kho. */
export function ConsumablesSection({ ctx }: { ctx: InventoryContext }) {
  const { products, canEdit } = ctx;
  const services = useApiData(() => call(() => api.GET("/catalog", { params: { query: { kind: "service", includeInactive: false } } })));
  const [serviceId, setServiceId] = useState("");

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {services.problem && !services.data ? (
        <ErrorState problem={services.problem} onRetry={services.reload} />
      ) : (
        <Field id="cs-service" label="Dịch vụ" hint="Chọn dịch vụ để xem hoặc đặt định mức vật tư mỗi buổi.">
          <Select value={serviceId} onValueChange={setServiceId} disabled={!services.data}>
            <SelectTrigger id="cs-service" className="h-11 w-full sm:h-9 sm:max-w-md">
              <SelectValue placeholder={services.data ? "Chọn dịch vụ" : "Đang tải..."} />
            </SelectTrigger>
            <SelectContent>
              {services.data?.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {services.data && services.data.length === 0 && <EmptyState icon={Scissors} title="Chưa có dịch vụ" description="Thêm dịch vụ trong Danh mục trước." />}

      {serviceId && <ConsumablesEditor key={serviceId} serviceId={serviceId} ctx={ctx} canEdit={canEdit} products={products} />}
    </div>
  );
}

function ConsumablesEditor({ serviceId, ctx, canEdit, products }: { serviceId: string; ctx: InventoryContext; canEdit: boolean; products: InventoryContext["products"] }) {
  const { data, problem, reload } = useApiData(() => call(() => api.GET("/inventory/consumables/{serviceId}", { params: { path: { serviceId } } })));
  // Chưa sửa gì → hiện theo dữ liệu BE; sửa rồi → giữ bản nháp cho tới khi lưu (lưu xong đặt lại null để lấy bản mới).
  const [edited, setEdited] = useState<Row[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveProblem, setSaveProblem] = useState<ApiProblem | null>(null);
  const [saved, setSaved] = useState(false);

  const rows = edited ?? (data ? toRows(data) : null);
  const current = rows ?? [];
  const setRows = (next: (rs: Row[]) => Row[]) => {
    setEdited(next(current));
    setSaved(false);
  };
  const remaining = products.filter((p) => !current.some((r) => r.productId === p.id));
  const update = (productId: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.productId === productId ? { ...r, ...patch } : r)));
  const valid = current.every((r) => Number(r.quantity) > 0);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSaveProblem(null);
    const result = await call(() =>
      api.PUT("/inventory/consumables/{serviceId}", {
        params: { path: { serviceId } },
        body: { items: current.map((r) => ({ productId: r.productId, quantityPerSession: Number(r.quantity) || 0 })) },
      }),
    );
    setSaving(false);
    if (!result.ok) return setSaveProblem(result.problem);
    setSaved(true);
    setEdited(null);
    reload();
  }

  if (problem && !data) return <ErrorState problem={problem} onRetry={reload} />;
  if (!rows) return <div role="status" aria-label="Đang tải định mức" className="h-24 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />;

  const errors = saveProblem?.fieldErrors ?? {};

  return (
    <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-3">
      {saveProblem && !Object.keys(errors).length && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{problemMessage(saveProblem)}</AlertDescription>
        </Alert>
      )}
      {current.length === 0 ? (
        <p className="text-sm text-muted-foreground">Dịch vụ này chưa có định mức. {canEdit ? "Thêm sản phẩm bên dưới." : ""}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {current.map((r, i) => {
            const product = products.find((p) => p.id === r.productId);
            return (
              <li key={r.productId} className="flex items-end gap-2 p-3">
                <div className="flex min-w-0 flex-1 flex-col pb-2.5">
                  <span className="truncate text-sm font-medium">{product?.name ?? "(sản phẩm không còn theo dõi kho)"}</span>
                  {product?.unit && <span className="text-xs text-muted-foreground">Đơn vị: {product.unit}</span>}
                </div>
                <Field id={`cs-qty-${r.productId}`} label="Mỗi buổi" error={errors[`items[${i}].quantityPerSession`]} className="w-32">
                  <Input
                    id={`cs-qty-${r.productId}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={r.quantity}
                    disabled={!canEdit || saving}
                    onChange={(e) => update(r.productId, { quantity: e.target.value })}
                    aria-invalid={Boolean(errors[`items[${i}].quantityPerSession`])}
                    className="h-11 sm:h-9"
                  />
                </Field>
                {canEdit && (
                  <Button type="button" variant="ghost" size="icon-sm" className="mb-0.5 size-9 shrink-0" aria-label="Bỏ" disabled={saving} onClick={() => setRows((rs) => rs.filter((x) => x.productId !== r.productId))}>
                    <Trash2 aria-hidden />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {canEdit && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Label htmlFor="cs-add" className="shrink-0 text-sm font-normal text-muted-foreground">
            Thêm sản phẩm
          </Label>
          <Select
            value=""
            onValueChange={(id) => setRows((rs) => [...rs, { productId: id, quantity: "1" }])}
            disabled={saving || remaining.length === 0}
          >
            <SelectTrigger id="cs-add" className="h-11 w-full sm:h-9 sm:max-w-md">
              <Plus className="text-muted-foreground" aria-hidden />
              <SelectValue placeholder={products.length === 0 ? "Chưa có sản phẩm theo dõi kho" : remaining.length === 0 ? "Đã thêm hết" : "Chọn sản phẩm / vật tư"} />
            </SelectTrigger>
            <SelectContent>
              {remaining.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {p.unit ? ` (${p.unit})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {canEdit && (
        <div className="flex items-center gap-3">
          <Button type="submit" className="h-11 sm:h-9" disabled={saving || !valid}>
            {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
            {saving ? "Đang lưu..." : "Lưu định mức"}
          </Button>
          {saved && (
            <span role="status" className="inline-flex items-center gap-1.5 text-sm text-success">
              <CircleCheck className="size-4" aria-hidden />
              Đã lưu
            </span>
          )}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Khi lịch hẹn chuyển sang &quot;Hoàn thành&quot;, kho của chi nhánh {ctx.branches.find((b) => b.id === ctx.branchId)?.name ?? "đó"} trừ đúng định mức này.</p>
    </form>
  );
}
