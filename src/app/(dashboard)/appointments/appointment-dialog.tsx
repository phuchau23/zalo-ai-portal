"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CircleAlert, CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import { Field, describedBy } from "@/components/common/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { call } from "@/lib/api/call";
import { api, type Appointment, type AvailableSlot, type Branch, type CatalogItem, type Schemas, type SeriesOutcome, type StaffMember } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { formatDateTimeTz, formatTime, fromLocalInput, groupSlots, isDateKey, seriesErrorLabel, toLocalInput } from "@/lib/appointments";
import { emptyToNull, formatDurationLabel } from "@/lib/crm";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ContactPicker, type ContactChoice } from "./contact-picker";

type CreateRequest = Schemas["CreateAppointmentRequest"];

export type CreatePreset = { branchId?: string | null; staffMemberId?: string | null; date?: string; time?: string; contactId?: string | null };

export type DialogMode = { kind: "create"; preset?: CreatePreset } | { kind: "reschedule"; appointment: Appointment };

const AUTO = "__auto__";
const intervalOptions = [
  { value: 7, label: "Mỗi tuần" },
  { value: 14, label: "Mỗi 2 tuần" },
  { value: 30, label: "Mỗi 30 ngày" },
];

/**
 * Hộp thoại đặt lịch mới hoặc dời lịch. Chọn dịch vụ + ngày xong thì tải khung giờ trống (GET /appointments/availability)
 * hiện thành chip; vẫn gõ giờ tay được (BE kiểm trùng). "Lặp lại" tạo chuỗi lịch và hiện kết quả từng lần.
 */
export function AppointmentDialog({
  mode,
  timeZone,
  branches,
  staff,
  services,
  packages,
  canOverlap,
  onClose,
  onSaved,
}: {
  mode: DialogMode;
  timeZone: string;
  branches: Branch[];
  staff: StaffMember[];
  services: CatalogItem[];
  packages: CatalogItem[];
  /** Có quyền "Quản lý nhân viên & ca làm" → được xếp chồng cố ý. */
  canOverlap: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const reschedule = mode.kind === "reschedule" ? mode.appointment : null;
  const preset = mode.kind === "create" ? (mode.preset ?? {}) : {};
  const initialLocal = reschedule ? toLocalInput(reschedule.startAt, timeZone) : "";

  const [branchId, setBranchId] = useState(
    reschedule?.branchId ?? preset.branchId ?? branches.find((b) => b.isDefault)?.id ?? branches[0]?.id ?? "",
  );
  const [contact, setContact] = useState<ContactChoice | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(reschedule ? reschedule.items.map((i) => i.catalogItemId) : []);
  const [staffId, setStaffId] = useState<string | null>(reschedule?.staffMemberId ?? preset.staffMemberId ?? null);
  const [date, setDate] = useState(reschedule ? initialLocal.slice(0, 10) : (preset.date ?? ""));
  const [time, setTime] = useState(reschedule ? initialLocal.slice(11, 16) : (preset.time ?? ""));
  const [note, setNote] = useState("");
  const [partySize, setPartySize] = useState(1);
  const [source, setSource] = useState<"staff" | "walk_in">("staff");
  const [allowOverlap, setAllowOverlap] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [intervalDays, setIntervalDays] = useState(7);
  const [occurrences, setOccurrences] = useState(4);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const [outcomes, setOutcomes] = useState<SeriesOutcome[] | null>(null);

  // Khung giờ trống tải theo "khóa" (chi nhánh + ngày + dịch vụ + nhân viên); khóa đổi mà chưa có kết quả = đang tải.
  const [slotsResult, setSlotsResult] = useState<{ key: string; slots: AvailableSlot[] | null; problem: ApiProblem | null } | null>(null);
  const slotsRequest = useRef(0);
  const slotsReady = isDateKey(date) && selectedIds.length > 0 && Boolean(branchId);
  const slotsKey = slotsReady ? [branchId, date, selectedIds.join(","), staffId ?? "", reschedule?.id ?? ""].join("|") : null;

  const errors = problem?.fieldErrors ?? {};
  const branchStaff = useMemo(() => staff.filter((s) => s.branchId === branchId && s.bookable && s.status === "active"), [staff, branchId]);
  const selectedItems = useMemo(
    () => [...services, ...packages].filter((i) => selectedIds.includes(i.id)),
    [services, packages, selectedIds],
  );
  const totalMinutes = selectedItems.reduce((sum, i) => sum + (i.durationMinutes ?? 0), 0);

  // Tải khung giờ trống khi đã có ngày + dịch vụ (và đổi chi nhánh / nhân viên).
  useEffect(() => {
    if (!slotsKey) return;
    const requestId = ++slotsRequest.current;
    void (async () => {
      const result = await call(() =>
        api.GET("/appointments/availability", {
          params: {
            query: {
              branchId,
              date,
              catalogItemIds: selectedIds.join(","),
              staffMemberId: staffId ?? undefined,
              ignoreAppointmentId: reschedule?.id ?? undefined,
            },
          },
        }),
      );
      if (requestId !== slotsRequest.current) return;
      setSlotsResult(result.ok ? { key: slotsKey, slots: result.data, problem: null } : { key: slotsKey, slots: null, problem: result.problem });
    })();
    // slotsKey gói đủ các phụ thuộc; chia nhỏ để không gọi lại khi mảng selectedIds đổi tham chiếu nhưng cùng nội dung.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotsKey]);

  const current = slotsResult && slotsResult.key === slotsKey ? slotsResult : null;
  const slotsLoading = Boolean(slotsKey) && !current;
  const slotsProblem = current?.problem ?? null;
  const slotGroups = useMemo(() => (current?.slots ? groupSlots(current.slots) : []), [current]);

  function toggleItem(id: string, checked: boolean) {
    setSelectedIds((ids) => (checked ? (ids.includes(id) ? ids : [...ids, id]) : ids.filter((x) => x !== id)));
  }

  const startAt = isDateKey(date) && /^\d{2}:\d{2}$/.test(time) ? fromLocalInput(`${date}T${time}`, timeZone) : null;
  const contactReady = contact?.kind === "existing" || (contact?.kind === "new" && contact.name.trim().length > 0);
  const canSubmit = reschedule ? Boolean(startAt) : Boolean(startAt) && selectedIds.length > 0 && contactReady && Boolean(branchId);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startAt) return;
    setSaving(true);
    setProblem(null);

    if (reschedule) {
      const result = await call(() =>
        api.POST("/appointments/{appointmentId}/reschedule", { params: { path: { appointmentId: reschedule.id } }, body: { startAt, staffMemberId: staffId } }),
      );
      setSaving(false);
      if (!result.ok) return setProblem(result.problem);
      onSaved();
      onClose();
      return;
    }

    const body: CreateRequest = {
      branchId,
      contactId: contact?.kind === "existing" ? contact.id : null,
      newContact:
        contact?.kind === "new" ? { name: contact.name.trim(), phone: emptyToNull(contact.phone), salutation: contact.salutation } : null,
      staffMemberId: staffId,
      resourceId: null,
      startAt,
      catalogItemIds: selectedIds,
      note: emptyToNull(note),
      partySize,
      source,
      allowOverlap: canOverlap && allowOverlap,
    };

    if (repeat) {
      const result = await call(() => api.POST("/appointments/series", { body: { first: body, intervalDays, occurrences } }));
      setSaving(false);
      if (!result.ok) return setProblem(result.problem);
      setOutcomes(result.data);
      onSaved();
      return;
    }

    const result = await call(() => api.POST("/appointments", { body }));
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    onSaved();
    onClose();
  }

  const p = reschedule ? "apt-move" : "apt-new";
  const title = reschedule ? "Dời lịch" : "Đặt lịch hẹn";

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {reschedule
              ? `${reschedule.contactName} · ${reschedule.items.map((i) => i.name).join(", ")} · đang hẹn ${formatDateTimeTz(reschedule.startAt, timeZone)}`
              : "Chọn khách, dịch vụ rồi chọn khung giờ trống. Giờ bận hoặc ngoài giờ mở cửa sẽ bị từ chối."}
          </DialogDescription>
        </DialogHeader>

        {outcomes ? (
          <SeriesOutcomes outcomes={outcomes} timeZone={timeZone} onClose={onClose} />
        ) : (
          <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-5">
            {problem && !Object.keys(errors).length && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden />
                <AlertDescription>{problemMessage(problem)}</AlertDescription>
              </Alert>
            )}

            {!reschedule && (
              <>
                {branches.length > 1 && (
                  <Field id={`${p}-branch`} label="Chi nhánh" error={errors.branchId}>
                    <Select
                      value={branchId}
                      onValueChange={(v) => {
                        setBranchId(v);
                        setStaffId(null);
                      }}
                    >
                      <SelectTrigger id={`${p}-branch`} className="h-11 w-full sm:h-9" aria-invalid={Boolean(errors.branchId)}>
                        <SelectValue placeholder="Chọn chi nhánh" />
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
                )}

                <ContactPicker idPrefix={p} value={contact} onChange={setContact} initialContactId={preset.contactId} errors={errors} disabled={saving} />

                <fieldset className="flex flex-col gap-2">
                  <legend className="text-sm font-medium">
                    Dịch vụ{" "}
                    {selectedIds.length > 0 && (
                      <span className="font-normal text-muted-foreground">
                        · {selectedIds.length} mục{totalMinutes > 0 && `, ${totalMinutes} phút`}
                      </span>
                    )}
                  </legend>
                  {errors.catalogItemIds && (
                    <p className="flex items-center gap-1.5 text-sm text-destructive">
                      <CircleAlert className="size-3.5 shrink-0" aria-hidden />
                      {errors.catalogItemIds}
                    </p>
                  )}
                  {services.length === 0 && packages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có dịch vụ nào trong Danh mục. Thêm dịch vụ trước khi đặt lịch.</p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto rounded-xl border bg-card">
                      <ItemList idPrefix={`${p}-svc`} items={services} selectedIds={selectedIds} onToggle={toggleItem} disabled={saving} />
                      {packages.length > 0 && (
                        <>
                          <p className="border-t bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">Gói liệu trình</p>
                          <ItemList idPrefix={`${p}-pkg`} items={packages} selectedIds={selectedIds} onToggle={toggleItem} disabled={saving} />
                        </>
                      )}
                    </div>
                  )}
                </fieldset>
              </>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={`${p}-staff`} label="Nhân viên" hint={branchStaff.length === 0 ? "Chi nhánh chưa có ai nhận lịch." : undefined} error={errors.staffMemberId}>
                <Select value={staffId ?? AUTO} onValueChange={(v) => setStaffId(v === AUTO ? null : v)} disabled={saving}>
                  <SelectTrigger id={`${p}-staff`} className="h-11 w-full sm:h-9" aria-invalid={Boolean(errors.staffMemberId)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AUTO}>Tự xếp</SelectItem>
                    {branchStaff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id={`${p}-date`} label="Ngày" error={errors.startAt}>
                <Input
                  id={`${p}-date`}
                  type="date"
                  required
                  value={date}
                  disabled={saving}
                  onChange={(e) => setDate(e.target.value)}
                  aria-invalid={Boolean(errors.startAt)}
                  className="h-11 sm:h-9"
                />
              </Field>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Khung giờ trống</span>
              {!slotsReady ? (
                <p className="text-sm text-muted-foreground">Chọn {selectedIds.length === 0 ? "dịch vụ" : "ngày"} để xem giờ còn trống.</p>
              ) : slotsLoading ? (
                <p role="status" className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                  Đang tìm giờ trống...
                </p>
              ) : slotsProblem ? (
                <p role="alert" className="text-sm text-destructive">
                  {problemMessage(slotsProblem)}
                </p>
              ) : slotGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ngày này không còn giờ trống. Chọn ngày khác hoặc gõ giờ tay nếu muốn xếp chồng.</p>
              ) : (
                <div role="group" aria-label="Giờ còn trống" className="flex flex-wrap gap-1.5">
                  {slotGroups.map((g) => {
                    const t = formatTime(g.startAt, timeZone);
                    const names = g.staff.map((s) => s.name).filter(Boolean).join(", ");
                    const active = t === time;
                    return (
                      <button
                        key={g.startAt}
                        type="button"
                        disabled={saving}
                        onClick={() => setTime(t)}
                        aria-pressed={active}
                        title={!staffId && names ? names : undefined}
                        className={cn(
                          "flex min-h-11 min-w-16 flex-col items-center justify-center rounded-md border px-2 py-1 text-sm tabular transition-colors sm:min-h-9",
                          "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                          active ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
                        )}
                      >
                        <span className="font-medium">{t}</span>
                        {!staffId && names && <span className={cn("max-w-28 truncate text-[0.65rem]", active ? "text-primary-foreground/80" : "text-muted-foreground")}>{names}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor={`${p}-time`} className="text-sm font-normal text-muted-foreground">
                  Hoặc gõ giờ
                </Label>
                <Input
                  id={`${p}-time`}
                  type="time"
                  value={time}
                  disabled={saving}
                  onChange={(e) => setTime(e.target.value)}
                  aria-invalid={Boolean(errors.startAt)}
                  aria-describedby={describedBy(`${p}-time`, errors.startAt)}
                  className="h-11 w-32 sm:h-9"
                />
                {startAt && <span className="text-xs text-muted-foreground">Bắt đầu {formatDateTimeTz(startAt, timeZone)}</span>}
              </div>
            </div>

            {!reschedule && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id={`${p}-party`} label="Số người" error={errors.partySize}>
                    <Input
                      id={`${p}-party`}
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={50}
                      value={partySize}
                      disabled={saving}
                      onChange={(e) => setPartySize(Math.max(1, Math.trunc(Number(e.target.value) || 1)))}
                      aria-invalid={Boolean(errors.partySize)}
                      className="h-11 sm:h-9"
                    />
                  </Field>
                  <Field id={`${p}-source`} label="Nguồn" error={errors.source}>
                    <Select value={source} onValueChange={(v) => setSource(v as typeof source)} disabled={saving}>
                      <SelectTrigger id={`${p}-source`} className="h-11 w-full sm:h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Nhân viên đặt</SelectItem>
                        <SelectItem value="walk_in">Khách đến trực tiếp</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field id={`${p}-note`} label="Ghi chú" error={errors.note}>
                  <Textarea
                    id={`${p}-note`}
                    rows={2}
                    maxLength={2000}
                    value={note}
                    disabled={saving}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Yêu cầu riêng của khách, lưu ý cho kỹ thuật viên..."
                    aria-invalid={Boolean(errors.note)}
                  />
                </Field>

                {canOverlap && (
                  <Label htmlFor={`${p}-overlap`} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-normal sm:min-h-9">
                    <Switch id={`${p}-overlap`} checked={allowOverlap} disabled={saving} onCheckedChange={setAllowOverlap} />
                    <span className="flex flex-col">
                      <span className="font-medium">Xếp chồng cố ý</span>
                      <span className="text-xs text-muted-foreground">Bỏ qua kiểm tra trùng giờ của nhân viên (ví dụ hai khách làm cùng lúc).</span>
                    </span>
                  </Label>
                )}

                <div className="flex flex-col gap-3 rounded-xl border bg-card p-3">
                  <Label htmlFor={`${p}-repeat`} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-normal sm:min-h-9">
                    <Switch id={`${p}-repeat`} checked={repeat} disabled={saving} onCheckedChange={setRepeat} />
                    <span className="flex flex-col">
                      <span className="font-medium">Lặp lại</span>
                      <span className="text-xs text-muted-foreground">Liệu trình nhiều buổi: tạo sẵn các lịch cách đều nhau, cùng giờ.</span>
                    </span>
                  </Label>
                  {repeat && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field id={`${p}-interval`} label="Cách nhau" error={errors.intervalDays}>
                        <Select value={String(intervalDays)} onValueChange={(v) => setIntervalDays(Number(v))} disabled={saving}>
                          <SelectTrigger id={`${p}-interval`} className="h-11 w-full sm:h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {intervalOptions.map((o) => (
                              <SelectItem key={o.value} value={String(o.value)}>
                                {o.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field id={`${p}-occ`} label="Số buổi" hint="2–12 buổi, tính cả buổi đầu." error={errors.occurrences}>
                        <Input
                          id={`${p}-occ`}
                          type="number"
                          inputMode="numeric"
                          min={2}
                          max={12}
                          value={occurrences}
                          disabled={saving}
                          onChange={(e) => setOccurrences(Math.min(12, Math.max(2, Math.trunc(Number(e.target.value) || 2))))}
                          aria-invalid={Boolean(errors.occurrences)}
                          className="h-11 sm:h-9"
                        />
                      </Field>
                    </div>
                  )}
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={saving} onClick={onClose}>
                Hủy
              </Button>
              <Button type="submit" className="h-11 sm:h-9" disabled={saving || !canSubmit}>
                {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
                {saving ? "Đang lưu..." : reschedule ? "Dời lịch" : repeat ? `Đặt ${occurrences} buổi` : "Đặt lịch"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ItemList({
  idPrefix,
  items,
  selectedIds,
  onToggle,
  disabled,
}: {
  idPrefix: string;
  items: CatalogItem[];
  selectedIds: string[];
  onToggle: (id: string, checked: boolean) => void;
  disabled: boolean;
}) {
  return (
    <ul className="flex flex-col divide-y">
      {items.map((item) => {
        const checked = selectedIds.includes(item.id);
        const meta = [formatDurationLabel(item), formatMoney(item.price)].filter(Boolean).join(" · ");
        return (
          <li key={item.id}>
            <Label htmlFor={`${idPrefix}-${item.id}`} className={cn("flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm font-normal hover:bg-muted/40", checked && "bg-primary/5")}>
              <Checkbox id={`${idPrefix}-${item.id}`} checked={checked} disabled={disabled} onCheckedChange={(v) => onToggle(item.id, v === true)} />
              <span className="min-w-0 flex-1 truncate">{item.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>
            </Label>
          </li>
        );
      })}
    </ul>
  );
}

/** Kết quả từng buổi của chuỗi lịch lặp. */
function SeriesOutcomes({ outcomes, timeZone, onClose }: { outcomes: SeriesOutcome[]; timeZone: string; onClose: () => void }) {
  const ok = outcomes.filter((o) => o.appointment).length;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        Đã đặt <span className="font-medium">{ok}/{outcomes.length}</span> buổi. Buổi không đặt được có thể đặt tay sau với giờ khác.
      </p>
      <ol className="flex flex-col divide-y rounded-xl border bg-card">
        {outcomes.map((o, i) => (
          <li key={`${o.startAt}-${i}`} className="flex items-center gap-2 px-3 py-2 text-sm">
            {o.appointment ? <CircleCheck className="size-4 shrink-0 text-success" aria-hidden /> : <CircleX className="size-4 shrink-0 text-destructive" aria-hidden />}
            <span className="w-8 text-muted-foreground">#{i + 1}</span>
            <span className="tabular font-medium">{formatDateTimeTz(o.startAt, timeZone)}</span>
            <span className={cn("ml-auto", o.appointment ? "text-success" : "text-destructive")}>
              {o.appointment ? "Đã đặt" : seriesErrorLabel(o.error) || "Không đặt được"}
            </span>
          </li>
        ))}
      </ol>
      <DialogFooter>
        <Button type="button" className="h-11 sm:h-9" onClick={onClose}>
          Đóng
        </Button>
      </DialogFooter>
    </div>
  );
}
