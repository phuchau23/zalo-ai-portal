"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CircleAlert, LoaderCircle, Plus, ShoppingBag, Trash2, UserRound } from "lucide-react";
import { Field } from "@/components/common/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type CatalogItem, type CustomerPackage, type Invoice, type InvoiceLineRequest } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { emptyToNull, kindLabels, type CatalogKind } from "@/lib/crm";
import { formatMoney } from "@/lib/format";
import { computeTotals, lineTotal } from "@/lib/sales";
import { useApiData } from "@/lib/use-api-data";
import { ContactPicker, type ContactChoice } from "../appointments/contact-picker";

export type EditorMode = { kind: "create"; preset?: { contactId?: string | null; branchId?: string | null } } | { kind: "edit"; invoice: Invoice };

type LineDraft = {
  key: number;
  kind: "catalog" | "package" | "custom";
  catalogItemId: string | null;
  customerPackageId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  performerStaffId: string | null;
};

const NONE = "__none__";
const CUSTOM = "__custom__";
const PKG = "pkg:";
let nextKey = 1;

function fromInvoice(inv: Invoice): LineDraft[] {
  return inv.lines.map((l) => ({
    key: nextKey++,
    kind: l.kind === "redemption" ? "package" : l.kind === "custom" ? "custom" : "catalog",
    catalogItemId: l.catalogItemId,
    customerPackageId: l.customerPackageId,
    description: l.description,
    quantity: String(l.quantity),
    unitPrice: String(l.unitPrice),
    discount: String(l.discount),
    performerStaffId: l.performerStaffId,
  }));
}

function toRequest(d: LineDraft): InvoiceLineRequest {
  const quantity = Math.max(1, Math.trunc(Number(d.quantity) || 1));
  const discount = Math.max(0, Math.trunc(Number(d.discount) || 0));
  if (d.kind === "package") {
    return { catalogItemId: null, customerPackageId: d.customerPackageId, description: null, quantity, unitPrice: 0, discount: 0, performerStaffId: d.performerStaffId };
  }
  const unitPrice = d.unitPrice.trim() === "" ? null : Math.max(0, Math.trunc(Number(d.unitPrice) || 0));
  if (d.kind === "custom") {
    return { catalogItemId: null, customerPackageId: null, description: d.description.trim(), quantity, unitPrice: unitPrice ?? 0, discount, performerStaffId: d.performerStaffId };
  }
  return { catalogItemId: d.catalogItemId, customerPackageId: null, description: null, quantity, unitPrice, discount, performerStaffId: d.performerStaffId };
}

/**
 * Soạn hóa đơn mới (chọn khách hoặc khách lẻ, thêm dòng từ danh mục / tự nhập / dùng buổi gói) hoặc sửa dòng hóa đơn chưa thu.
 * Lưu xong gọi `onSaved(invoice)` để trang mở chi tiết.
 */
export function InvoiceEditorDialog({ mode, onClose, onSaved }: { mode: EditorMode; onClose: () => void; onSaved: (invoice: Invoice) => void }) {
  const { me } = useSession();
  const editing = mode.kind === "edit" ? mode.invoice : null;
  const preset = mode.kind === "create" ? (mode.preset ?? {}) : {};

  const branches = useApiData(() => call(() => api.GET("/branches", { params: { query: { includeInactive: false } } })));
  const staff = useApiData(() => call(() => api.GET("/staff", { params: { query: { includeInactive: false } } })));
  const catalog = useApiData(() => call(() => api.GET("/catalog", { params: { query: { includeInactive: false } } })));

  const [selectedBranch, setSelectedBranch] = useState(editing?.branchId ?? preset.branchId ?? "");
  const [contact, setContact] = useState<ContactChoice | null>(null);
  const [lines, setLines] = useState<LineDraft[]>(() => (editing ? fromInvoice(editing) : []));
  const [note, setNote] = useState(editing?.note ?? "");
  const [picker, setPicker] = useState("");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);

  // Chi nhánh: người dùng chọn; chưa chọn → của nhân viên (nếu bị giới hạn), rồi chi nhánh mặc định, rồi chi nhánh đầu.
  const branchId = useMemo(() => {
    const list = branches.data ?? [];
    if (selectedBranch && (editing || list.some((b) => b.id === selectedBranch))) return selectedBranch;
    const mine = me.currentTenant?.branchId;
    if (mine && list.some((b) => b.id === mine)) return mine;
    return list.find((b) => b.isDefault)?.id ?? list[0]?.id ?? "";
  }, [selectedBranch, branches.data, editing, me.currentTenant?.branchId]);

  const contactId = editing ? editing.contactId : contact?.kind === "existing" ? contact.id : null;

  // Gói liệu trình còn hiệu lực của khách → dòng "Dùng buổi gói".
  const packages = useApiData<CustomerPackage[]>(() =>
    contactId ? call(() => api.GET("/customer-packages", { params: { query: { contactId } } })) : Promise.resolve({ ok: true, data: [] }),
  );
  useEffect(() => {
    packages.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);
  const activePackages = useMemo(() => (packages.data ?? []).filter((p) => p.status === "active" && p.remaining > 0), [packages.data]);

  const byKind = useMemo(() => {
    const groups: Record<CatalogKind, CatalogItem[]> = { service: [], package: [], product: [] };
    for (const item of catalog.data ?? []) {
      if (item.kind === "service" || item.kind === "package" || item.kind === "product") groups[item.kind].push(item);
    }
    return groups;
  }, [catalog.data]);
  const branchStaff = useMemo(() => (staff.data ?? []).filter((s) => s.branchId === branchId && s.status === "active"), [staff.data, branchId]);

  function addLine(value: string) {
    setPicker("");
    const base = { key: nextKey++, quantity: "1", discount: "0", performerStaffId: null };
    if (value === CUSTOM) {
      setLines((ls) => [...ls, { ...base, kind: "custom", catalogItemId: null, customerPackageId: null, description: "", unitPrice: "" }]);
      return;
    }
    if (value.startsWith(PKG)) {
      const pkg = activePackages.find((p) => p.id === value.slice(PKG.length));
      if (!pkg) return;
      setLines((ls) => [...ls, { ...base, kind: "package", catalogItemId: pkg.catalogItemId, customerPackageId: pkg.id, description: `Dùng buổi: ${pkg.name}`, unitPrice: "0" }]);
      return;
    }
    const item = catalog.data?.find((i) => i.id === value);
    if (!item) return;
    setLines((ls) => [...ls, { ...base, kind: "catalog", catalogItemId: item.id, customerPackageId: null, description: item.name, unitPrice: item.price === null ? "" : String(item.price) }]);
  }

  function update(key: number, patch: Partial<LineDraft>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  const amounts = lines.map((l) => ({ quantity: Number(l.quantity) || 0, unitPrice: Number(l.unitPrice) || 0, discount: Number(l.discount) || 0 }));
  const totals = computeTotals(amounts, editing?.discountAmount ?? 0, editing?.voucherAmount ?? 0);
  const linesValid = lines.length > 0 && lines.every((l) => (l.kind !== "custom" || (l.description.trim() && l.unitPrice.trim() !== "")) && Number(l.quantity) >= 1);
  const canSubmit = linesValid && Boolean(branchId) && (contact === null || contact.kind === "existing");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setProblem(null);
    const body = { lines: lines.map(toRequest), note: emptyToNull(note) };
    const result = editing
      ? await call(() => api.PUT("/invoices/{invoiceId}/lines", { params: { path: { invoiceId: editing.id } }, body }))
      : await call(() => api.POST("/invoices", { body: { branchId: branchId || null, contactId, appointmentId: null, ...body } }));
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    onSaved(result.data);
  }

  const errors = problem?.fieldErrors ?? {};
  const lineError = (index: number, field: string) => errors[`lines[${index}].${field}`] ?? errors[`lines[${index}].${field[0].toUpperCase()}${field.slice(1)}`];
  const loading = !branches.data || !staff.data || !catalog.data;
  const p = editing ? "inv-edit" : "inv-new";

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Sửa hóa đơn ${editing.number}` : "Tạo hóa đơn"}</DialogTitle>
          <DialogDescription>
            {editing ? "Chỉ sửa được khi chưa thu tiền. Giảm giá và voucher giữ nguyên." : "Chọn khách (hoặc để trống cho khách lẻ) rồi thêm dịch vụ, sản phẩm, hoặc dùng buổi gói."}
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-5">
          {problem && !Object.keys(errors).length && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>{problemMessage(problem)}</AlertDescription>
            </Alert>
          )}

          {editing ? (
            <p className="flex min-h-9 items-center gap-2 text-sm">
              <UserRound className="size-4 text-muted-foreground" aria-hidden />
              {editing.contactName ?? "Khách lẻ"} · {editing.branchName}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {(branches.data?.length ?? 0) > 1 && (
                <Field id={`${p}-branch`} label="Chi nhánh" error={errors.branchId}>
                  <Select
                    value={branchId}
                    onValueChange={(v) => {
                      setSelectedBranch(v);
                      setLines((ls) => ls.map((l) => ({ ...l, performerStaffId: null })));
                    }}
                    disabled={saving}
                  >
                    <SelectTrigger id={`${p}-branch`} className="h-11 w-full sm:h-9" aria-invalid={Boolean(errors.branchId)}>
                      <SelectValue placeholder="Chọn chi nhánh" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.data?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <div className="sm:col-span-2">
                <ContactPicker idPrefix={p} value={contact} onChange={setContact} allowNew={false} initialContactId={preset.contactId} errors={errors} disabled={saving} />
                {!contact && <p className="mt-1 text-xs text-muted-foreground">Không chọn = khách lẻ: không lưu hồ sơ, không dùng gói hay thẻ trả trước được.</p>}
              </div>
            </div>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium">Các dòng</legend>
            {errors.lines && (
              <p className="flex items-center gap-1.5 text-sm text-destructive">
                <CircleAlert className="size-3.5 shrink-0" aria-hidden />
                {errors.lines}
              </p>
            )}
            {lines.length === 0 ? (
              <p className="flex items-center gap-2.5 rounded-2xl border border-dashed bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
                <ShoppingBag className="size-5 shrink-0" aria-hidden />
                Chưa có dòng nào. Chọn dịch vụ, gói hoặc sản phẩm ở ô &quot;Thêm dòng&quot; bên dưới.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {lines.map((l, i) => {
                  const amount = lineTotal({ quantity: Number(l.quantity) || 0, unitPrice: Number(l.unitPrice) || 0, discount: Number(l.discount) || 0 });
                  return (
                    <li
                      key={l.key}
                      className="flex flex-col gap-2 rounded-2xl border bg-card p-3 shadow-card animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none"
                    >
                      <div className="flex items-start gap-2">
                        {l.kind === "custom" ? (
                          <Field id={`${p}-desc-${l.key}`} label="Mô tả" error={lineError(i, "description")} className="min-w-0 flex-1">
                            <Input
                              id={`${p}-desc-${l.key}`}
                              value={l.description}
                              maxLength={200}
                              required
                              disabled={saving}
                              onChange={(e) => update(l.key, { description: e.target.value })}
                              placeholder="Phụ thu, phí giao hàng..."
                              aria-invalid={Boolean(lineError(i, "description"))}
                              className="h-11 sm:h-9"
                            />
                          </Field>
                        ) : (
                          <div className="flex min-w-0 flex-1 items-center gap-2.5 pt-0.5">
                            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground tabular" aria-hidden>
                              {i + 1}
                            </span>
                            <span className="flex min-w-0 flex-col">
                              <span className="text-sm font-semibold">{l.description}</span>
                              <span className="text-xs text-muted-foreground">{l.kind === "package" ? "Dùng buổi gói (0 đ)" : "Từ danh mục"}</span>
                            </span>
                          </div>
                        )}
                        <Button type="button" variant="ghost" size="icon-sm" className="size-9 shrink-0" aria-label="Bỏ dòng" disabled={saving} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>
                          <Trash2 aria-hidden />
                        </Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-4">
                        <Field id={`${p}-qty-${l.key}`} label="SL" error={lineError(i, "quantity")}>
                          <Input
                            id={`${p}-qty-${l.key}`}
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={999}
                            value={l.quantity}
                            disabled={saving}
                            onChange={(e) => update(l.key, { quantity: e.target.value })}
                            aria-invalid={Boolean(lineError(i, "quantity"))}
                            className="h-11 sm:h-9"
                          />
                        </Field>
                        {l.kind !== "package" && (
                          <>
                            <Field id={`${p}-price-${l.key}`} label="Đơn giá" error={lineError(i, "unitPrice")}>
                              <Input
                                id={`${p}-price-${l.key}`}
                                type="number"
                                inputMode="numeric"
                                min={0}
                                step={1000}
                                value={l.unitPrice}
                                disabled={saving}
                                onChange={(e) => update(l.key, { unitPrice: e.target.value })}
                                placeholder={l.kind === "catalog" ? "Theo danh mục" : "0"}
                                aria-invalid={Boolean(lineError(i, "unitPrice"))}
                                className="h-11 sm:h-9"
                              />
                            </Field>
                            <Field id={`${p}-disc-${l.key}`} label="Giảm dòng" error={lineError(i, "discount")}>
                              <Input
                                id={`${p}-disc-${l.key}`}
                                type="number"
                                inputMode="numeric"
                                min={0}
                                step={1000}
                                value={l.discount}
                                disabled={saving}
                                onChange={(e) => update(l.key, { discount: e.target.value })}
                                aria-invalid={Boolean(lineError(i, "discount"))}
                                className="h-11 sm:h-9"
                              />
                            </Field>
                          </>
                        )}
                        <Field id={`${p}-staff-${l.key}`} label="Người làm" error={lineError(i, "performerStaffId")} className={l.kind === "package" ? "sm:col-span-2" : undefined}>
                          <Select value={l.performerStaffId ?? NONE} onValueChange={(v) => update(l.key, { performerStaffId: v === NONE ? null : v })} disabled={saving}>
                            <SelectTrigger id={`${p}-staff-${l.key}`} className="h-11 w-full sm:h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>Không ghi</SelectItem>
                              {branchStaff.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.displayName}
                                </SelectItem>
                              ))}
                              {l.performerStaffId && !branchStaff.some((s) => s.id === l.performerStaffId) && (
                                <SelectItem value={l.performerStaffId}>{staff.data?.find((s) => s.id === l.performerStaffId)?.displayName ?? "(đã nghỉ)"}</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </Field>
                      </div>
                      <p className="flex items-center justify-end gap-2 border-t border-dashed pt-2 text-sm">
                        <span className="text-xs text-muted-foreground">Thành tiền</span>
                        <span className="tabular font-semibold">{formatMoney(amount)}</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Label htmlFor={`${p}-add`} className="shrink-0 text-sm font-normal text-muted-foreground">
                Thêm dòng
              </Label>
              <Select value={picker} onValueChange={addLine} disabled={saving || loading}>
                <SelectTrigger id={`${p}-add`} className="h-11 w-full border-dashed border-primary/40 bg-primary/[0.03] hover:bg-primary/[0.06] sm:h-10 sm:max-w-md">
                  <Plus className="text-muted-foreground" aria-hidden />
                  <SelectValue placeholder={loading ? "Đang tải danh mục..." : "Chọn dịch vụ, gói, sản phẩm hoặc dòng tự nhập"} />
                </SelectTrigger>
                <SelectContent>
                  {activePackages.length > 0 && (
                    <SelectGroup>
                      <SelectLabel>Dùng buổi gói của khách</SelectLabel>
                      {activePackages.map((pk) => (
                        <SelectItem key={pk.id} value={`${PKG}${pk.id}`}>
                          {pk.name} · còn {pk.remaining}/{pk.totalSessions} buổi
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  )}
                  {(["service", "package", "product"] as CatalogKind[]).map(
                    (kind) =>
                      byKind[kind].length > 0 && (
                        <SelectGroup key={kind}>
                          <SelectLabel>{kindLabels[kind]}</SelectLabel>
                          {byKind[kind].map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} · {item.price === null ? "Liên hệ" : formatMoney(item.price)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ),
                  )}
                  <SelectGroup>
                    <SelectLabel>Khác</SelectLabel>
                    <SelectItem value={CUSTOM}>Dòng tự nhập (mô tả + giá)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Field id={`${p}-note`} label="Ghi chú" error={errors.note}>
              <Textarea id={`${p}-note`} rows={2} maxLength={1000} value={note} disabled={saving} onChange={(e) => setNote(e.target.value)} aria-invalid={Boolean(errors.note)} />
            </Field>
            <dl className="flex min-w-56 flex-col gap-1.5 self-start rounded-2xl border bg-card p-4 text-sm shadow-card">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Tạm tính</dt>
                <dd className="tabular">{formatMoney(totals.subtotal)}</dd>
              </div>
              {totals.discount + totals.voucher > 0 && (
                <div className="flex justify-between gap-3 text-destructive">
                  <dt>Giảm + voucher</dt>
                  <dd className="tabular">− {formatMoney(totals.discount + totals.voucher)}</dd>
                </div>
              )}
              <div className="mt-1 flex items-baseline justify-between gap-3 rounded-xl bg-primary/[0.07] px-3 py-2.5">
                <dt className="font-semibold">Tổng</dt>
                <dd className="tabular text-xl font-bold tracking-tight text-primary">{formatMoney(totals.total)}</dd>
              </div>
            </dl>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={saving} onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" className="h-11 sm:h-9" disabled={saving || !canSubmit}>
              {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
              {saving ? "Đang lưu..." : editing ? "Lưu dòng" : "Tạo hóa đơn"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
