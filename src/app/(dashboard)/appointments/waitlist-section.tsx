"use client";

import { useEffect, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { CircleAlert, CircleCheck, Clock3, Hourglass, LoaderCircle, Plus } from "lucide-react";
import { Field, describedBy } from "@/components/common/field";
import { IconTile } from "@/components/common/icon-tile";
import { PersonAvatar } from "@/components/common/person-avatar";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { call } from "@/lib/api/call";
import { api, type CatalogItem, type StaffMember, type WaitlistEntry } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { formatDateTimeTz, fromLocalInput, toLocalInput } from "@/lib/appointments";
import type { BadgeVariant } from "@/lib/customers";
import { emptyToNull } from "@/lib/crm";
import { fadeUp, stagger } from "@/lib/motion";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { ContactPicker, type ContactChoice } from "./contact-picker";

const AUTO = "__auto__";

const waitlistStatusLabels: Record<string, { label: string; variant: BadgeVariant }> = {
  waiting: { label: "Đang chờ", variant: "warning" },
  offered: { label: "Đã mời giờ", variant: "info" },
  booked: { label: "Đã đặt", variant: "success" },
  cancelled: { label: "Đã hủy", variant: "secondary" },
};

/**
 * Hàng chờ: khách muốn giờ đang kín. Khi có chỗ trống, bot/nhân viên mời khách; đặt xong thì đánh "Đã đặt".
 */
export function WaitlistSection({
  branchId,
  timeZone,
  services,
  staff,
}: {
  branchId: string;
  timeZone: string;
  services: CatalogItem[];
  staff: StaffMember[];
}) {
  const { data, problem, reload } = useApiData(() =>
    branchId ? call(() => api.GET("/waitlist", { params: { query: { branchId } } })) : Promise.resolve({ ok: true as const, data: [] as WaitlistEntry[] }),
  );
  const [showAll, setShowAll] = useState(false);
  const [adding, setAdding] = useState(false);
  const [actionProblem, setActionProblem] = useState<ApiProblem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    reload();
  }, [branchId, reload]);

  async function setStatus(entry: WaitlistEntry, status: "booked" | "cancelled") {
    setActionProblem(null);
    setBusyId(entry.id);
    const result = await call(() => api.PATCH("/waitlist/{entryId}/status", { params: { path: { entryId: entry.id } }, body: { status } }));
    setBusyId(null);
    if (!result.ok) setActionProblem(result.problem);
    reload();
  }

  const rows = (data ?? []).filter((e) => showAll || e.status === "waiting" || e.status === "offered").sort((a, b) => a.preferredFrom.localeCompare(b.preferredFrom));
  const openCount = (data ?? []).filter((e) => e.status === "waiting" || e.status === "offered").length;
  const hiddenCount = (data ?? []).length - openCount;
  const branchStaff = staff.filter((s) => s.branchId === branchId && s.bookable && s.status === "active");

  return (
    <div className="flex flex-col gap-4">
      <div className="surface flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <IconTile icon={Hourglass} tone="warning" size="md" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold">
              Khách đang chờ giờ trống
              {openCount > 0 && (
                <span className="tabular ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-warning px-1.5 text-[11px] font-semibold text-white align-middle">
                  {openCount}
                </span>
              )}
            </p>
            <p className="text-sm text-pretty text-muted-foreground">Khách muốn giờ đang kín. Có chỗ trống thì mời khách và đặt lịch, rồi đánh dấu &quot;Đã đặt&quot;.</p>
            <Label htmlFor="wl-all" className="flex min-h-11 w-fit cursor-pointer items-center gap-2 text-sm font-normal sm:min-h-0 sm:pt-1">
              <Checkbox id="wl-all" checked={showAll} onCheckedChange={(v) => setShowAll(v === true)} />
              Hiện cả đã đặt / đã hủy {hiddenCount > 0 && <span className="tabular text-muted-foreground">({hiddenCount})</span>}
            </Label>
          </div>
        </div>
        <Button onClick={() => setAdding(true)} className="h-11 shrink-0 sm:h-9" disabled={!branchId}>
          <Plus aria-hidden />
          Thêm vào hàng chờ
        </Button>
      </div>

      {actionProblem && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(actionProblem)}
        </p>
      )}

      {problem && !data ? (
        <ErrorState problem={problem} onRetry={reload} />
      ) : !data ? (
        <LoadingRows rows={3} columns={3} label="Đang tải hàng chờ" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Hourglass} title="Hàng chờ trống" description="Khi khách muốn giờ đã kín, thêm vào đây để không quên mời khách khi có chỗ." />
      ) : (
        <motion.ul variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-2">
          {rows.map((e) => {
            const status = waitlistStatusLabels[e.status] ?? { label: e.status, variant: "outline" as const };
            const open = e.status === "waiting" || e.status === "offered";
            const busy = busyId === e.id;
            const staffName = e.staffMemberId ? (staff.find((s) => s.id === e.staffMemberId)?.displayName ?? "nhân viên đã nghỉ") : null;
            return (
              <motion.li
                key={e.id}
                variants={fadeUp}
                className={cn("surface flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center", !open && "opacity-75")}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <PersonAvatar name={e.contactName} size="md" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2 font-semibold">
                      {e.contactName}
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground/85">{e.serviceName}</span>
                      {staffName && (
                        <span className="inline-flex items-center gap-1.5">
                          <span aria-hidden>·</span>
                          <PersonAvatar name={staffName} size="xs" />
                          {staffName}
                        </span>
                      )}
                    </span>
                    <span className="inline-flex w-fit flex-wrap items-center gap-1.5 rounded-lg bg-muted/60 px-2 py-1 text-xs text-muted-foreground tabular">
                      <Clock3 className="size-3.5 shrink-0" aria-hidden />
                      Muốn từ {formatDateTimeTz(e.preferredFrom, timeZone)} đến {formatDateTimeTz(e.preferredTo, timeZone)}
                    </span>
                    {e.offeredSlotAt && (
                      <span className="text-xs font-medium text-info tabular">Đã mời giờ {formatDateTimeTz(e.offeredSlotAt, timeZone)}</span>
                    )}
                  </div>
                </div>
                {open && (
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button variant="outline" size="sm" className="h-11 sm:h-8" disabled={busy} onClick={() => void setStatus(e, "booked")}>
                      <CircleCheck aria-hidden />
                      Đã đặt
                    </Button>
                    <Button variant="ghost" size="sm" className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-8" disabled={busy} onClick={() => void setStatus(e, "cancelled")}>
                      Hủy
                    </Button>
                  </div>
                )}
              </motion.li>
            );
          })}
        </motion.ul>
      )}

      {adding && (
        <AddWaitlistDialog
          branchId={branchId}
          timeZone={timeZone}
          services={services}
          staff={branchStaff}
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            reload();
          }}
        />
      )}
    </div>
  );
}

function AddWaitlistDialog({
  branchId,
  timeZone,
  services,
  staff,
  onClose,
  onAdded,
}: {
  branchId: string;
  timeZone: string;
  services: CatalogItem[];
  staff: StaffMember[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [contact, setContact] = useState<ContactChoice | null>(null);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [staffId, setStaffId] = useState<string | null>(null);
  const [from, setFrom] = useState(() => toLocalInput(new Date(Date.now() + 60 * 60_000), timeZone));
  const [to, setTo] = useState(() => toLocalInput(new Date(Date.now() + 7 * 24 * 60 * 60_000), timeZone));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const errors = problem?.fieldErrors ?? {};

  const preferredFrom = fromLocalInput(from, timeZone);
  const preferredTo = fromLocalInput(to, timeZone);
  const canSubmit = contact?.kind === "existing" && serviceId && preferredFrom && preferredTo && preferredFrom < preferredTo;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (contact?.kind !== "existing" || !preferredFrom || !preferredTo) return;
    setSaving(true);
    setProblem(null);
    const result = await call(() =>
      api.POST("/waitlist", { body: { branchId, contactId: contact.id, catalogItemId: serviceId, staffMemberId: staffId, preferredFrom, preferredTo, note: emptyToNull(note) } }),
    );
    setSaving(false);
    if (!result.ok) return setProblem(result.problem);
    onAdded();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm vào hàng chờ</DialogTitle>
          <DialogDescription>Khách có sẵn trong danh sách; khách mới thì tạo ở trang Khách hàng trước.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
          {problem && !Object.keys(errors).length && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>{problemMessage(problem)}</AlertDescription>
            </Alert>
          )}
          <ContactPicker idPrefix="wl" value={contact} onChange={setContact} allowNew={false} errors={errors} disabled={saving} />
          <Field id="wl-service" label="Dịch vụ" error={errors.catalogItemId}>
            <Select value={serviceId} onValueChange={setServiceId} disabled={saving || services.length === 0}>
              <SelectTrigger id="wl-service" className="h-11 w-full sm:h-9" aria-invalid={Boolean(errors.catalogItemId)}>
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
          </Field>
          <Field id="wl-staff" label="Nhân viên mong muốn" error={errors.staffMemberId}>
            <Select value={staffId ?? AUTO} onValueChange={(v) => setStaffId(v === AUTO ? null : v)} disabled={saving}>
              <SelectTrigger id="wl-staff" className="h-11 w-full sm:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO}>Ai cũng được</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="wl-from" label="Muốn từ" error={errors.preferredFrom}>
              <Input id="wl-from" type="datetime-local" value={from} disabled={saving} onChange={(e) => setFrom(e.target.value)} aria-invalid={Boolean(errors.preferredFrom)} className="h-11 sm:h-9" />
            </Field>
            <Field id="wl-to" label="Đến" hint="Giờ doanh nghiệp." error={errors.preferredTo}>
              <Input
                id="wl-to"
                type="datetime-local"
                value={to}
                min={from}
                disabled={saving}
                onChange={(e) => setTo(e.target.value)}
                aria-invalid={Boolean(errors.preferredTo)}
                aria-describedby={describedBy("wl-to", errors.preferredTo, true)}
                className="h-11 sm:h-9"
              />
            </Field>
          </div>
          <Field id="wl-note" label="Ghi chú" error={errors.note}>
            <Textarea id="wl-note" rows={2} maxLength={1000} value={note} disabled={saving} onChange={(e) => setNote(e.target.value)} aria-invalid={Boolean(errors.note)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 sm:h-9" disabled={saving} onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" className="h-11 sm:h-9" disabled={saving || !canSubmit}>
              {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
              {saving ? "Đang lưu..." : "Thêm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
