"use client";

import { CircleAlert, Plus, Trash2 } from "lucide-react";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CatalogItem } from "@/lib/api/client";
import { formatMoney } from "@/lib/format";
import { formatQty } from "@/lib/sales";

export type ProductLine = { key: number; catalogItemId: string; quantity: string; unitCost: string };

let nextKey = 1;

export function newProductLine(catalogItemId: string, quantity = "1", unitCost = ""): ProductLine {
  return { key: nextKey++, catalogItemId, quantity, unitCost };
}

/**
 * Bảng dòng sản phẩm dùng chung cho phiếu nhập (có giá vốn), chuyển kho và kiểm kê (chỉ số lượng).
 * `hint(catalogItemId)` hiện tồn hiện tại hoặc gợi ý dưới tên sản phẩm.
 */
export function ProductLinesEditor({
  idPrefix,
  products,
  lines,
  onChange,
  withCost = false,
  quantityLabel = "Số lượng",
  disabled = false,
  errors = {},
  hint,
}: {
  idPrefix: string;
  products: CatalogItem[];
  lines: ProductLine[];
  onChange: (lines: ProductLine[]) => void;
  withCost?: boolean;
  quantityLabel?: string;
  disabled?: boolean;
  errors?: Record<string, string>;
  hint?: (catalogItemId: string) => string | null;
}) {
  const remaining = products.filter((p) => !lines.some((l) => l.catalogItemId === p.id));
  const update = (key: number, patch: Partial<ProductLine>) => onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const lineError = (i: number, field: string) => errors[`lines[${i}].${field}`] ?? errors[`lines[${i}].${field[0].toUpperCase()}${field.slice(1)}`];

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">Sản phẩm</legend>
      {errors.lines && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {errors.lines}
        </p>
      )}
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có sản phẩm nào. Chọn bên dưới để thêm.</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {lines.map((l, i) => {
            const product = products.find((p) => p.id === l.catalogItemId);
            const extra = hint?.(l.catalogItemId);
            return (
              <li key={l.key} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-end">
                <div className="flex min-w-0 flex-1 flex-col pb-0.5">
                  <span className="truncate text-sm font-medium">{product?.name ?? "(sản phẩm)"}</span>
                  <span className="text-xs text-muted-foreground">
                    {[product?.sku, product?.unit].filter(Boolean).join(" · ")}
                    {extra && ` · ${extra}`}
                  </span>
                </div>
                <Field id={`${idPrefix}-qty-${l.key}`} label={quantityLabel} error={lineError(i, "quantity") ?? lineError(i, "countedQuantity")} className="sm:w-32">
                  <Input
                    id={`${idPrefix}-qty-${l.key}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={l.quantity}
                    disabled={disabled}
                    onChange={(e) => update(l.key, { quantity: e.target.value })}
                    aria-invalid={Boolean(lineError(i, "quantity"))}
                    className="h-11 sm:h-9"
                  />
                </Field>
                {withCost && (
                  <Field id={`${idPrefix}-cost-${l.key}`} label="Giá vốn/đv" error={lineError(i, "unitCost")} className="sm:w-40">
                    <Input
                      id={`${idPrefix}-cost-${l.key}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={1000}
                      value={l.unitCost}
                      disabled={disabled}
                      onChange={(e) => update(l.key, { unitCost: e.target.value })}
                      placeholder={product?.costPrice ? String(product.costPrice) : "0"}
                      aria-invalid={Boolean(lineError(i, "unitCost"))}
                      className="h-11 sm:h-9"
                    />
                  </Field>
                )}
                {withCost && (
                  <span className="tabular pb-2.5 text-sm font-medium sm:w-28 sm:text-right">
                    {formatMoney(Math.max(0, Number(l.quantity) || 0) * Math.max(0, Number(l.unitCost) || 0))}
                  </span>
                )}
                <Button type="button" variant="ghost" size="icon-sm" className="size-9 shrink-0 self-end sm:mb-0.5" aria-label="Bỏ dòng" disabled={disabled} onClick={() => onChange(lines.filter((x) => x.key !== l.key))}>
                  <Trash2 aria-hidden />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Label htmlFor={`${idPrefix}-add`} className="shrink-0 text-sm font-normal text-muted-foreground">
          Thêm sản phẩm
        </Label>
        <Select
          value=""
          onValueChange={(id) => {
            const product = products.find((p) => p.id === id);
            if (product) onChange([...lines, newProductLine(id, "1", withCost && product.costPrice ? String(product.costPrice) : "")]);
          }}
          disabled={disabled || remaining.length === 0}
        >
          <SelectTrigger id={`${idPrefix}-add`} className="h-11 w-full sm:h-9 sm:max-w-md">
            <Plus className="text-muted-foreground" aria-hidden />
            <SelectValue placeholder={products.length === 0 ? "Chưa có sản phẩm theo dõi kho" : remaining.length === 0 ? "Đã thêm hết" : "Chọn sản phẩm"} />
          </SelectTrigger>
          <SelectContent>
            {remaining.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
                {p.sku ? ` · ${p.sku}` : ""}
                {hint?.(p.id) ? ` · ${hint(p.id)}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </fieldset>
  );
}

/** "Tồn 12 hộp" cho gợi ý dưới tên sản phẩm. */
export function stockHint(levels: { catalogItemId: string; quantity: number; unit: string | null }[] | undefined, catalogItemId: string): string | null {
  const level = levels?.find((l) => l.catalogItemId === catalogItemId);
  if (!level) return null;
  return `Tồn ${formatQty(level.quantity)}${level.unit ? ` ${level.unit}` : ""}`;
}
