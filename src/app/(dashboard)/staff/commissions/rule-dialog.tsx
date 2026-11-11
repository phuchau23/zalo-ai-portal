"use client";

import { useState, type FormEvent } from "react";
import { Calculator, LoaderCircle } from "lucide-react";
import { Field, describedBy } from "@/components/common/field";
import { FilterPills } from "@/components/common/filter-pills";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { call } from "@/lib/api/call";
import { api, type CatalogItem, type Schemas, type StaffMember } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { formatMoney } from "@/lib/format";
import { commissionAmount, scopeLabels, type CommissionScope } from "./commission-rules";

type Rule = Schemas["CommissionRuleResponse"];
const EVERYONE = "__everyone__";

/** Thêm/sửa một quy tắc hoa hồng. Có ô "Ví dụ" tính thử ngay để chủ doanh nghiệp thấy quy tắc ra bao nhiêu tiền. */
export function RuleDialog({
  rule,
  staff,
  items,
  onClose,
  onSaved,
}: {
  rule: Rule | null;
  staff: StaffMember[];
  items: CatalogItem[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [who, setWho] = useState(rule?.staffMemberId ?? EVERYONE);
  const [scope, setScope] = useState<CommissionScope>((rule?.scope as CommissionScope) ?? "service");
  const [itemId, setItemId] = useState(rule?.catalogItemId ?? "");
  const [kind, setKind] = useState<"percent" | "fixed">((rule?.kind as "percent" | "fixed") ?? "percent");
  const [value, setValue] = useState(rule ? String(rule.value) : "10");
  const [active, setActive] = useState(rule?.isActive ?? true);
  const [note, setNote] = useState(rule?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);

  const numeric = Number(value.replace(/\D/g, ""));
  const valueError = value.trim() === "" ? "Nhập mức hoa hồng." : kind === "percent" && numeric > 100 ? "Phần trăm tối đa 100." : undefined;
  const itemError = scope === "item" && !itemId ? "Chọn một dịch vụ, gói hoặc sản phẩm." : undefined;
  const errors = problem?.fieldErrors ?? {};
  const example = scope === "package" ? null : 500_000;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (valueError || itemError) return;
    setBusy(true);
    setProblem(null);
    const body = { staffMemberId: who === EVERYONE ? null : who, scope, catalogItemId: scope === "item" ? itemId : null, kind, value: numeric, isActive: active, note: note.trim() || null };
    const result = rule
      ? await call(() => api.PUT("/commissions/rules/{ruleId}", { params: { path: { ruleId: rule.id } }, body }))
      : await call(() => api.POST("/commissions/rules", { body }));
    setBusy(false);
    if (!result.ok) return setProblem(result.problem);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{rule ? "Sửa quy tắc hoa hồng" : "Thêm quy tắc hoa hồng"}</DialogTitle>
          <DialogDescription>Hoa hồng tự tính khi hóa đơn được thu đủ tiền, hoặc khi khách dùng một buổi trong gói.</DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
          {problem && !Object.keys(errors).length && (
            <Alert variant="destructive">
              <AlertDescription>{problemMessage(problem)}</AlertDescription>
            </Alert>
          )}

          <Field id="rule-who" label="Áp dụng cho" hint="Quy tắc riêng của một người được ưu tiên hơn quy tắc chung." error={errors.staffMemberId}>
            <Select value={who} onValueChange={setWho}>
              <SelectTrigger id="rule-who" className="h-11 w-full sm:h-10" aria-describedby={describedBy("rule-who", errors.staffMemberId, true)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EVERYONE}>Mọi nhân viên</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="rule-scope" label="Tính trên" hint={scopeLabels[scope].hint} error={errors.scope}>
            <Select value={scope} onValueChange={(v) => setScope(v as CommissionScope)}>
              <SelectTrigger id="rule-scope" className="h-11 w-full sm:h-10" aria-describedby={describedBy("rule-scope", errors.scope, true)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(scopeLabels) as CommissionScope[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {scopeLabels[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {scope === "item" && (
            <Field id="rule-item" label="Mục cụ thể" error={itemError ?? errors.catalogItemId}>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger id="rule-item" className="h-11 w-full sm:h-10" aria-invalid={!!itemError} aria-describedby={describedBy("rule-item", itemError)}>
                  <SelectValue placeholder="Chọn dịch vụ, gói hoặc sản phẩm" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium" id="rule-kind-label">
                Cách tính
              </span>
              <FilterPills
                label="Cách tính hoa hồng"
                variant="soft"
                value={kind}
                onChange={(k) => {
                  setKind(k);
                  setValue(k === "percent" ? "10" : "50000");
                }}
                options={[
                  { value: "percent", label: "Phần trăm" },
                  { value: "fixed", label: "Số tiền cố định" },
                ]}
              />
            </div>
            <Field id="rule-value" label={kind === "percent" ? "Mức (%)" : "Mức (đồng)"} error={valueError ?? errors.value}>
              <div className="relative">
                <Input
                  id="rule-value"
                  inputMode="numeric"
                  value={kind === "fixed" && numeric ? numeric.toLocaleString("vi-VN") : value}
                  onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
                  aria-invalid={!!valueError}
                  aria-describedby={describedBy("rule-value", valueError)}
                  className="h-11 pr-10 tabular-nums sm:h-10"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">{kind === "percent" ? "%" : "đ"}</span>
              </div>
            </Field>
          </div>

          {!valueError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm">
              <Calculator className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <p className="text-pretty">
                <span className="font-medium">Ví dụ: </span>
                {example === null
                  ? `mỗi buổi khách dùng trong gói → ${kind === "percent" ? `${numeric}% giá trị một buổi` : formatMoney(numeric)} cho người làm.`
                  : `dòng hóa đơn ${formatMoney(example)} → hoa hồng ${formatMoney(commissionAmount(kind, numeric, example))}.`}
              </p>
            </div>
          )}

          <Field id="rule-note" label="Ghi chú (không bắt buộc)" error={errors.note}>
            <Textarea id="rule-note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: áp dụng từ tháng 11" />
          </Field>

          <label htmlFor="rule-active" className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3">
            <span className="flex flex-col">
              <span className="text-sm font-medium">Đang áp dụng</span>
              <span className="text-xs text-muted-foreground">Tắt để tạm ngưng mà không xóa quy tắc.</span>
            </span>
            <Switch id="rule-active" checked={active} onCheckedChange={setActive} />
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy} className="h-11 sm:h-9">
              Hủy
            </Button>
            <Button type="submit" disabled={busy || !!valueError || !!itemError} className="h-11 sm:h-9">
              {busy && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
              {busy ? "Đang lưu..." : "Lưu quy tắc"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
