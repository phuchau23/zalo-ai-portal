"use client";

import { useMemo, useState, type FormEvent } from "react";
import { CircleAlert, LoaderCircle, Lock, Plus, Ticket } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { call } from "@/lib/api/call";
import { api, type SaveVoucherRequest, type Voucher } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { emptyToNull, localToIso, normalizeCode, parseOptionalInt } from "@/lib/crm";
import { formatDateTime, formatMoney } from "@/lib/format";
import { voucherIsUsable, voucherValueLabel, type VoucherKind } from "@/lib/sales";
import { useApiData, useNow } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";

/** Mã giảm giá: danh sách + tạo/sửa. Sửa cần quyền "Quản lý danh mục bán". */
export function VouchersSection({ canEdit }: { canEdit: boolean }) {
  const { data, problem, loading, reload } = useApiData(() => call(() => api.GET("/vouchers", { params: { query: { includeInactive: true } } })));
  const [includeInactive, setIncludeInactive] = useState(false);
  const [dialog, setDialog] = useState<{ voucher: Voucher | null } | null>(null);
  const now = useNow(60_000);

  const rows = useMemo(() => (data ?? []).filter((v) => includeInactive || v.isActive), [data, includeInactive]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Label htmlFor="voucher-inactive" className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-normal sm:min-h-0">
          <Checkbox id="voucher-inactive" checked={includeInactive} onCheckedChange={(v) => setIncludeInactive(v === true)} />
          Hiện mã đã tắt
        </Label>
        {canEdit && (
          <Button className="h-11 sm:h-9" onClick={() => setDialog({ voucher: null })}>
            <Plus aria-hidden />
            Thêm voucher
          </Button>
        )}
      </div>

      {!canEdit && (
        <Alert>
          <Lock aria-hidden />
          <AlertDescription>Bạn chỉ xem được voucher. Cần quyền &quot;Quản lý danh mục bán&quot; để thêm hoặc sửa.</AlertDescription>
        </Alert>
      )}

      {problem && !data ? (
        <ErrorState problem={problem} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingRows rows={3} columns={4} label="Đang tải voucher" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Ticket} title="Chưa có voucher" description="Tạo mã giảm giá (theo % hoặc số tiền) để nhập vào hóa đơn khi thu tiền.">
          {canEdit && (
            <Button className="h-11 sm:h-9" onClick={() => setDialog({ voucher: null })}>
              <Plus aria-hidden />
              Thêm voucher
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Giảm</TableHead>
                <TableHead className="hidden sm:table-cell">Tối thiểu</TableHead>
                <TableHead className="hidden md:table-cell">Hiệu lực</TableHead>
                <TableHead className="text-right">Đã dùng</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((v) => {
                const usable = voucherIsUsable(v, now);
                return (
                  <TableRow key={v.id} className={cn(canEdit && "cursor-pointer", !v.isActive && "text-muted-foreground")} onClick={() => canEdit && setDialog({ voucher: v })}>
                    <TableCell>
                      {canEdit ? (
                        <button type="button" className="font-mono font-medium focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none" onClick={() => setDialog({ voucher: v })}>
                          {v.code}
                        </button>
                      ) : (
                        <span className="font-mono font-medium">{v.code}</span>
                      )}
                      {v.note && <div className="max-w-56 truncate text-xs text-muted-foreground">{v.note}</div>}
                    </TableCell>
                    <TableCell className="tabular">{voucherValueLabel(v)}</TableCell>
                    <TableCell className="tabular hidden sm:table-cell">{v.minTotal > 0 ? formatMoney(v.minTotal) : "—"}</TableCell>
                    <TableCell className="hidden text-xs md:table-cell">
                      {v.validFrom || v.validTo ? `${v.validFrom ? formatDateTime(v.validFrom) : "…"} → ${v.validTo ? formatDateTime(v.validTo) : "…"}` : "Không giới hạn"}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {v.usedCount}
                      {v.maxUses !== null && ` / ${v.maxUses}`}
                    </TableCell>
                    <TableCell>
                      {!v.isActive ? <Badge variant="secondary">Đã tắt</Badge> : usable ? <Badge variant="success">Dùng được</Badge> : <Badge variant="warning">Hết hạn / hết lượt</Badge>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {dialog && (
        <VoucherDialog
          voucher={dialog.voucher}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

type Form = {
  code: string;
  kind: VoucherKind;
  value: string;
  maxDiscount: string;
  minTotal: string;
  validFrom: string;
  validTo: string;
  maxUses: string;
  isActive: boolean;
  note: string;
};

/** ISO → "YYYY-MM-DDTHH:mm" theo múi giờ trình duyệt cho ô datetime-local. */
function isoToLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function VoucherDialog({ voucher, onClose, onSaved }: { voucher: Voucher | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Form>({
    code: voucher?.code ?? "",
    kind: voucher?.kind === "amount" ? "amount" : "percent",
    value: voucher ? String(voucher.value) : "",
    maxDiscount: voucher?.maxDiscount ? String(voucher.maxDiscount) : "",
    minTotal: voucher ? String(voucher.minTotal) : "0",
    validFrom: isoToLocal(voucher?.validFrom ?? null),
    validTo: isoToLocal(voucher?.validTo ?? null),
    maxUses: voucher?.maxUses ? String(voucher.maxUses) : "",
    isActive: voucher?.isActive ?? true,
    note: voucher?.note ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const errors = problem?.fieldErrors ?? {};
  const update = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setProblem(null);
    const body: SaveVoucherRequest = {
      code: normalizeCode(form.code),
      kind: form.kind,
      value: Math.max(0, Math.trunc(Number(form.value) || 0)),
      maxDiscount: form.kind === "percent" ? parseOptionalInt(form.maxDiscount) : null,
      minTotal: Math.max(0, Math.trunc(Number(form.minTotal) || 0)),
      validFrom: localToIso(form.validFrom),
      validTo: localToIso(form.validTo),
      maxUses: parseOptionalInt(form.maxUses),
      isActive: form.isActive,
      note: emptyToNull(form.note),
    };
    const result = voucher
      ? await call(() => api.PUT("/vouchers/{voucherId}", { params: { path: { voucherId: voucher.id } }, body }))
      : await call(() => api.POST("/vouchers", { body }));
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    onSaved();
  }

  const p = "vch";
  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{voucher ? `Sửa voucher ${voucher.code}` : "Thêm voucher"}</DialogTitle>
          <DialogDescription>Nhân viên nhập mã này vào hóa đơn; hệ thống tự kiểm hạn, lượt dùng và giá trị tối thiểu.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
          {problem && !Object.keys(errors).length && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>{problemMessage(problem)}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${p}-code`} label="Mã" hint="Chữ in hoa, số, gạch ngang." error={errors.code}>
              <Input
                id={`${p}-code`}
                value={form.code}
                required
                maxLength={40}
                disabled={saving}
                onChange={(e) => update({ code: e.target.value.toUpperCase() })}
                onBlur={() => update({ code: normalizeCode(form.code) })}
                autoComplete="off"
                aria-invalid={Boolean(errors.code)}
                className="h-11 font-mono uppercase sm:h-9"
              />
            </Field>
            <Field id={`${p}-kind`} label="Kiểu giảm" error={errors.kind}>
              <Select value={form.kind} onValueChange={(v) => update({ kind: v as VoucherKind })} disabled={saving}>
                <SelectTrigger id={`${p}-kind`} className="h-11 w-full sm:h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Theo phần trăm</SelectItem>
                  <SelectItem value="amount">Số tiền cố định</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field id={`${p}-value`} label={form.kind === "percent" ? "Giảm (%)" : "Giảm (đ)"} error={errors.value}>
              <Input
                id={`${p}-value`}
                type="number"
                inputMode="numeric"
                min={0}
                max={form.kind === "percent" ? 100 : undefined}
                step={form.kind === "percent" ? 1 : 1000}
                value={form.value}
                required
                disabled={saving}
                onChange={(e) => update({ value: e.target.value })}
                aria-invalid={Boolean(errors.value)}
                className="h-11 sm:h-9"
              />
            </Field>
            {form.kind === "percent" && (
              <Field id={`${p}-max`} label="Giảm tối đa (đ)" hint="Trống = không giới hạn." error={errors.maxDiscount}>
                <Input
                  id={`${p}-max`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1000}
                  value={form.maxDiscount}
                  disabled={saving}
                  onChange={(e) => update({ maxDiscount: e.target.value })}
                  aria-invalid={Boolean(errors.maxDiscount)}
                  className="h-11 sm:h-9"
                />
              </Field>
            )}
            <Field id={`${p}-min`} label="Hóa đơn tối thiểu (đ)" error={errors.minTotal}>
              <Input
                id={`${p}-min`}
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                value={form.minTotal}
                disabled={saving}
                onChange={(e) => update({ minTotal: e.target.value })}
                aria-invalid={Boolean(errors.minTotal)}
                className="h-11 sm:h-9"
              />
            </Field>
            <Field id={`${p}-uses`} label="Số lượt tối đa" hint="Trống = không giới hạn." error={errors.maxUses}>
              <Input
                id={`${p}-uses`}
                type="number"
                inputMode="numeric"
                min={1}
                value={form.maxUses}
                disabled={saving}
                onChange={(e) => update({ maxUses: e.target.value })}
                aria-invalid={Boolean(errors.maxUses)}
                className="h-11 sm:h-9"
              />
            </Field>
            <Field id={`${p}-from`} label="Hiệu lực từ" error={errors.validFrom}>
              <Input id={`${p}-from`} type="datetime-local" value={form.validFrom} disabled={saving} onChange={(e) => update({ validFrom: e.target.value })} aria-invalid={Boolean(errors.validFrom)} className="h-11 sm:h-9" />
            </Field>
            <Field id={`${p}-to`} label="Đến" error={errors.validTo}>
              <Input id={`${p}-to`} type="datetime-local" value={form.validTo} disabled={saving} onChange={(e) => update({ validTo: e.target.value })} aria-invalid={Boolean(errors.validTo)} className="h-11 sm:h-9" />
            </Field>
          </div>
          <Field id={`${p}-note`} label="Ghi chú" error={errors.note}>
            <Textarea id={`${p}-note`} rows={2} maxLength={500} value={form.note} disabled={saving} onChange={(e) => update({ note: e.target.value })} />
          </Field>
          <Label htmlFor={`${p}-active`} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-normal sm:min-h-9">
            <Switch id={`${p}-active`} checked={form.isActive} disabled={saving} onCheckedChange={(v) => update({ isActive: v })} />
            <span className="font-medium">Đang bật</span>
          </Label>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={saving} onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" className="h-11 sm:h-9" disabled={saving || !form.code.trim() || form.value.trim() === ""}>
              {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
              {saving ? "Đang lưu..." : voucher ? "Lưu" : "Thêm voucher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
