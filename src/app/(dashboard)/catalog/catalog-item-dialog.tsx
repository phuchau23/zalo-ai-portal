"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CircleAlert, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { Field, describedBy } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { call } from "@/lib/api/call";
import { api, type Branch, type CatalogItem, type Schemas } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { emptyToNull, kindLabels, normalizeCode, parseOptionalInt, type CatalogKind } from "@/lib/crm";

type SaveRequest = Schemas["SaveCatalogItemRequest"];
type Content = { key: number; serviceId: string; sessionCount: string };

/** Ô nhập giữ dạng chuỗi để người dùng gõ tự do; đổi sang số khi gửi. */
type FormState = {
  code: string;
  name: string;
  groupName: string;
  price: string;
  priceNote: string;
  durationMinutes: string;
  bufferMinutes: string;
  sessionCount: string;
  validityDays: string;
  sku: string;
  unit: string;
  costPrice: string;
  trackInventory: boolean;
};

const str = (v: number | string | null | undefined) => (v === null || v === undefined ? "" : String(v));

function toForm(item: CatalogItem | null): FormState {
  return {
    code: item?.code ?? "",
    name: item?.name ?? "",
    groupName: item?.groupName ?? "",
    price: str(item?.price),
    priceNote: item?.priceNote ?? "",
    durationMinutes: str(item?.durationMinutes),
    bufferMinutes: str(item?.bufferMinutes ?? 0),
    sessionCount: str(item?.sessionCount),
    validityDays: str(item?.validityDays),
    sku: item?.sku ?? "",
    unit: item?.unit ?? "",
    costPrice: str(item?.costPrice),
    trackInventory: item?.trackInventory ?? false,
  };
}

function toRequest(kind: CatalogKind, form: FormState): SaveRequest {
  return {
    kind,
    code: normalizeCode(form.code),
    name: form.name.trim(),
    groupName: emptyToNull(form.groupName),
    price: parseOptionalInt(form.price),
    priceNote: emptyToNull(form.priceNote),
    durationMinutes: kind === "product" ? null : parseOptionalInt(form.durationMinutes),
    bufferMinutes: kind === "product" ? 0 : (parseOptionalInt(form.bufferMinutes) ?? 0),
    sessionCount: kind === "package" ? parseOptionalInt(form.sessionCount) : null,
    validityDays: kind === "package" ? parseOptionalInt(form.validityDays) : null,
    sku: kind === "product" ? emptyToNull(form.sku) : null,
    unit: kind === "package" ? null : emptyToNull(form.unit),
    costPrice: kind === "product" ? parseOptionalInt(form.costPrice) : null,
    trackInventory: kind === "product" ? form.trackInventory : false,
  };
}

let contentKey = 0;

/** Thêm/sửa một mục danh mục: thông tin theo loại, chi nhánh bán, nội dung gói (gói liệu trình), trạng thái bán. */
export function CatalogItemDialog({
  kind,
  item,
  canEdit,
  branches,
  onClose,
  onSaved,
}: {
  kind: CatalogKind;
  item: CatalogItem | null;
  canEdit: boolean;
  branches: Branch[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(item));
  const [allBranches, setAllBranches] = useState(true);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [services, setServices] = useState<CatalogItem[]>([]);
  const [isActive, setIsActive] = useState(item?.isActive ?? true);
  const [detailLoading, setDetailLoading] = useState(item !== null);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const errors = problem?.fieldErrors ?? {};
  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [detail, serviceList] = await Promise.all([
        item ? call(() => api.GET("/catalog/{itemId}", { params: { path: { itemId: item.id } } })) : Promise.resolve(null),
        kind === "package" ? call(() => api.GET("/catalog", { params: { query: { kind: "service", includeInactive: false } } })) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      if (detail) {
        if (!detail.ok) {
          setProblem(detail.problem);
        } else {
          setAllBranches(detail.data.branchIds.length === 0);
          setBranchIds(detail.data.branchIds);
          setContents(detail.data.contents.map((c) => ({ key: ++contentKey, serviceId: c.serviceId, sessionCount: String(c.sessionCount) })));
        }
      }
      if (serviceList?.ok) setServices(serviceList.data);
      setDetailLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [item, kind]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    setProblem(null);
    const body = toRequest(kind, form);
    const saved = item
      ? await call(() => api.PUT("/catalog/{itemId}", { params: { path: { itemId: item.id } }, body }))
      : await call(() => api.POST("/catalog", { body }));
    if (!saved.ok) {
      setSaving(false);
      return setProblem(saved.problem);
    }
    const id = saved.data.id;

    const nextBranchIds = allBranches ? [] : branchIds;
    if (branches.length > 0) {
      const result = await call(() => api.PUT("/catalog/{itemId}/branches", { params: { path: { itemId: id } }, body: { branchIds: nextBranchIds } }));
      if (!result.ok) {
        setSaving(false);
        return setProblem(result.problem);
      }
    }

    if (kind === "package") {
      const result = await call(() =>
        api.PUT("/catalog/{itemId}/contents", {
          params: { path: { itemId: id } },
          body: { contents: contents.filter((c) => c.serviceId).map((c) => ({ serviceId: c.serviceId, sessionCount: parseOptionalInt(c.sessionCount) ?? 1 })) },
        }),
      );
      if (!result.ok) {
        setSaving(false);
        return setProblem(result.problem);
      }
    }

    if (item && item.isActive !== isActive) {
      const result = await call(() => api.PATCH("/catalog/{itemId}/active", { params: { path: { itemId: id } }, body: { isActive } }));
      if (!result.ok) {
        setSaving(false);
        return setProblem(result.problem);
      }
    }

    setSaving(false);
    onSaved();
  }

  const ro = !canEdit;
  const p = item ? `ci-${item.id}` : "ci-new";
  const numberProps = { type: "number" as const, inputMode: "numeric" as const, min: 0, className: "h-11 sm:h-9" };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
        <form noValidate onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{item ? (canEdit ? `Sửa ${kindLabels[kind].toLowerCase()}` : item.name) : `Thêm ${kindLabels[kind].toLowerCase()}`}</DialogTitle>
            <DialogDescription>
              {item ? (
                <>
                  Mã <code className="font-mono">{item.code}</code> · {item.inKnowledge ? "Bot đã biết mục này." : "Bot chưa biết mục này, sẽ được thêm vào Kho kiến thức khi lưu."}
                </>
              ) : (
                "Mục mới cũng được thêm vào Kho kiến thức để bot báo giá."
              )}
            </DialogDescription>
          </DialogHeader>

          {problem && !Object.keys(errors).length && (
            <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
              <CircleAlert className="size-4 shrink-0" aria-hidden />
              {problemMessage(problem)}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {!item && (
              <Field id={`${p}-code`} label="Mã" hint="Chữ in hoa không dấu, ví dụ DV-MASSAGE-60. Không đổi được sau khi tạo." error={errors.code} className="sm:col-span-2">
                <Input
                  id={`${p}-code`}
                  required
                  maxLength={50}
                  value={form.code}
                  onChange={(e) => update({ code: e.target.value })}
                  onBlur={() => update({ code: normalizeCode(form.code) })}
                  aria-invalid={Boolean(errors.code)}
                  aria-describedby={describedBy(`${p}-code`, errors.code, true)}
                  className="h-11 font-mono sm:h-9"
                />
              </Field>
            )}
            <Field id={`${p}-name`} label="Tên" error={errors.name} className="sm:col-span-2">
              <Input id={`${p}-name`} required maxLength={200} value={form.name} disabled={ro} onChange={(e) => update({ name: e.target.value })} aria-invalid={Boolean(errors.name)} className="h-11 sm:h-9" />
            </Field>
            <Field id={`${p}-group`} label="Nhóm" hint="Ví dụ: Chăm sóc da, Massage." error={errors.groupName}>
              <Input id={`${p}-group`} maxLength={100} value={form.groupName} disabled={ro} onChange={(e) => update({ groupName: e.target.value })} aria-invalid={Boolean(errors.groupName)} aria-describedby={describedBy(`${p}-group`, errors.groupName, true)} className="h-11 sm:h-9" />
            </Field>
            <Field id={`${p}-price`} label="Giá (đ)" hint="Để trống nếu báo giá sau." error={errors.price}>
              <Input id={`${p}-price`} {...numberProps} step={1000} value={form.price} disabled={ro} onChange={(e) => update({ price: e.target.value })} aria-invalid={Boolean(errors.price)} aria-describedby={describedBy(`${p}-price`, errors.price, true)} />
            </Field>
            {kind !== "product" && (
              <Field id={`${p}-priceNote`} label="Ghi chú giá" hint='Ví dụ: "tùy vùng da", "đã gồm VAT".' error={errors.priceNote} className="sm:col-span-2">
                <Input id={`${p}-priceNote`} maxLength={200} value={form.priceNote} disabled={ro} onChange={(e) => update({ priceNote: e.target.value })} aria-invalid={Boolean(errors.priceNote)} aria-describedby={describedBy(`${p}-priceNote`, errors.priceNote, true)} className="h-11 sm:h-9" />
              </Field>
            )}

            {kind === "service" && (
              <>
                <Field id={`${p}-duration`} label="Thời lượng (phút)" error={errors.durationMinutes}>
                  <Input id={`${p}-duration`} {...numberProps} step={5} value={form.durationMinutes} disabled={ro} onChange={(e) => update({ durationMinutes: e.target.value })} aria-invalid={Boolean(errors.durationMinutes)} />
                </Field>
                <Field id={`${p}-buffer`} label="Dọn sau dịch vụ (phút)" hint="Khoảng nghỉ trước lịch kế tiếp." error={errors.bufferMinutes}>
                  <Input id={`${p}-buffer`} {...numberProps} max={120} step={5} value={form.bufferMinutes} disabled={ro} onChange={(e) => update({ bufferMinutes: e.target.value })} aria-invalid={Boolean(errors.bufferMinutes)} aria-describedby={describedBy(`${p}-buffer`, errors.bufferMinutes, true)} />
                </Field>
                <Field id={`${p}-unit`} label="Đơn vị" hint='Ví dụ: "lần", "vùng".' error={errors.unit}>
                  <Input id={`${p}-unit`} maxLength={50} value={form.unit} disabled={ro} onChange={(e) => update({ unit: e.target.value })} aria-invalid={Boolean(errors.unit)} aria-describedby={describedBy(`${p}-unit`, errors.unit, true)} className="h-11 sm:h-9" />
                </Field>
              </>
            )}

            {kind === "package" && (
              <>
                <Field id={`${p}-sessions`} label="Số buổi" error={errors.sessionCount}>
                  <Input id={`${p}-sessions`} {...numberProps} value={form.sessionCount} disabled={ro} onChange={(e) => update({ sessionCount: e.target.value })} aria-invalid={Boolean(errors.sessionCount)} />
                </Field>
                <Field id={`${p}-duration`} label="Phút / buổi" error={errors.durationMinutes}>
                  <Input id={`${p}-duration`} {...numberProps} step={5} value={form.durationMinutes} disabled={ro} onChange={(e) => update({ durationMinutes: e.target.value })} aria-invalid={Boolean(errors.durationMinutes)} />
                </Field>
                <Field id={`${p}-validity`} label="Hạn dùng (ngày)" hint="Tính từ ngày mua." error={errors.validityDays}>
                  <Input id={`${p}-validity`} {...numberProps} value={form.validityDays} disabled={ro} onChange={(e) => update({ validityDays: e.target.value })} aria-invalid={Boolean(errors.validityDays)} aria-describedby={describedBy(`${p}-validity`, errors.validityDays, true)} />
                </Field>
                <Field id={`${p}-buffer`} label="Dọn sau mỗi buổi (phút)" error={errors.bufferMinutes}>
                  <Input id={`${p}-buffer`} {...numberProps} max={120} step={5} value={form.bufferMinutes} disabled={ro} onChange={(e) => update({ bufferMinutes: e.target.value })} aria-invalid={Boolean(errors.bufferMinutes)} />
                </Field>
              </>
            )}

            {kind === "product" && (
              <>
                <Field id={`${p}-unit`} label="Đơn vị" hint='Ví dụ: "chai", "hộp".' error={errors.unit}>
                  <Input id={`${p}-unit`} maxLength={50} value={form.unit} disabled={ro} onChange={(e) => update({ unit: e.target.value })} aria-invalid={Boolean(errors.unit)} aria-describedby={describedBy(`${p}-unit`, errors.unit, true)} className="h-11 sm:h-9" />
                </Field>
                <Field id={`${p}-sku`} label="Mã SKU" error={errors.sku}>
                  <Input id={`${p}-sku`} maxLength={100} value={form.sku} disabled={ro} onChange={(e) => update({ sku: e.target.value })} aria-invalid={Boolean(errors.sku)} className="h-11 font-mono sm:h-9" />
                </Field>
                <Field id={`${p}-cost`} label="Giá vốn (đ)" hint="Chỉ người có quyền xem báo cáo thấy." error={errors.costPrice}>
                  <Input id={`${p}-cost`} {...numberProps} step={1000} value={form.costPrice} disabled={ro} onChange={(e) => update({ costPrice: e.target.value })} aria-invalid={Boolean(errors.costPrice)} aria-describedby={describedBy(`${p}-cost`, errors.costPrice, true)} />
                </Field>
                <Label htmlFor={`${p}-track`} className="flex min-h-11 cursor-pointer items-center gap-2 self-end text-sm font-normal">
                  <Checkbox id={`${p}-track`} checked={form.trackInventory} disabled={ro} onCheckedChange={(v) => update({ trackInventory: v === true })} />
                  Theo dõi tồn kho
                </Label>
              </>
            )}
          </div>

          {kind === "package" && (
            <PackageContents contents={contents} services={services} loading={detailLoading} canEdit={canEdit} onChange={setContents} prefix={p} />
          )}

          {branches.length > 1 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">Bán ở chi nhánh</legend>
              <Label htmlFor={`${p}-all-branches`} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-normal sm:min-h-9">
                <Checkbox id={`${p}-all-branches`} checked={allBranches} disabled={ro || detailLoading} onCheckedChange={(v) => setAllBranches(v === true)} />
                Mọi chi nhánh
              </Label>
              {!allBranches && (
                <div className="grid gap-1 pl-6 sm:grid-cols-2">
                  {branches.map((b) => {
                    const id = `${p}-branch-${b.id}`;
                    return (
                      <Label key={b.id} htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-normal sm:min-h-9">
                        <Checkbox
                          id={id}
                          checked={branchIds.includes(b.id)}
                          disabled={ro}
                          onCheckedChange={(v) => setBranchIds((ids) => (v === true ? [...ids.filter((x) => x !== b.id), b.id] : ids.filter((x) => x !== b.id)))}
                        />
                        {b.name}
                      </Label>
                    );
                  })}
                </div>
              )}
            </fieldset>
          )}

          {item && (
            <Label htmlFor={`${p}-active`} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-normal sm:min-h-9">
              <Switch id={`${p}-active`} checked={isActive} disabled={ro} onCheckedChange={setIsActive} />
              {isActive ? "Đang bán" : "Ngừng bán (ẩn khỏi lịch hẹn và bot)"}
            </Label>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={saving} onClick={onClose}>
              {canEdit ? "Hủy" : "Đóng"}
            </Button>
            {canEdit && (
              <Button type="submit" className="h-11 sm:h-9" disabled={saving || detailLoading || !form.name.trim() || (!item && !form.code.trim())}>
                {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
                {saving ? "Đang lưu..." : item ? "Lưu" : "Thêm"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Nội dung gói liệu trình: dịch vụ nào, bao nhiêu buổi. */
function PackageContents({
  contents,
  services,
  loading,
  canEdit,
  onChange,
  prefix,
}: {
  contents: Content[];
  services: CatalogItem[];
  loading: boolean;
  canEdit: boolean;
  onChange: (next: Content[]) => void;
  prefix: string;
}) {
  const setRow = (key: number, patch: Partial<Content>) => onChange(contents.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium">Gói gồm</legend>
      {loading ? (
        <div className="h-9 animate-pulse rounded-md bg-muted motion-reduce:animate-none" aria-hidden />
      ) : contents.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa chọn dịch vụ nào. {services.length === 0 && "Hãy thêm dịch vụ ở tab Dịch vụ trước."}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {contents.map((c) => (
            <li key={c.key} className="grid grid-cols-[1fr_6rem_auto] items-center gap-2">
              <Label htmlFor={`${prefix}-content-${c.key}`} className="sr-only">
                Dịch vụ
              </Label>
              <Select value={c.serviceId} onValueChange={(serviceId) => setRow(c.key, { serviceId })} disabled={!canEdit}>
                <SelectTrigger id={`${prefix}-content-${c.key}`} className="h-11 w-full sm:h-9">
                  <SelectValue placeholder="Chọn dịch vụ" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label htmlFor={`${prefix}-sessions-${c.key}`} className="sr-only">
                Số buổi
              </Label>
              <Input
                id={`${prefix}-sessions-${c.key}`}
                type="number"
                inputMode="numeric"
                min={1}
                value={c.sessionCount}
                disabled={!canEdit}
                onChange={(e) => setRow(c.key, { sessionCount: e.target.value })}
                aria-label="Số buổi"
                className="h-11 sm:h-9"
              />
              {canEdit ? (
                <Button type="button" variant="ghost" size="icon-sm" className="size-11 sm:size-9" aria-label="Bỏ dịch vụ khỏi gói" onClick={() => onChange(contents.filter((x) => x.key !== c.key))}>
                  <Trash2 />
                </Button>
              ) : (
                <span className="text-sm text-muted-foreground">buổi</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && services.length > 0 && (
        <Button type="button" variant="outline" size="sm" className="h-11 w-fit sm:h-8" onClick={() => onChange([...contents, { key: ++contentKey, serviceId: services[0].id, sessionCount: "1" }])}>
          <Plus aria-hidden />
          Thêm dịch vụ
        </Button>
      )}
    </fieldset>
  );
}
