"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { Field, describedBy } from "@/components/common/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { call } from "@/lib/api/call";
import { api, type Schemas } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { defaultTimeZone, fromLocalInput, toLocalInput } from "@/lib/appointments";

type Attendance = Schemas["AttendanceResponse"];

/** Quản lý sửa giờ vào/ra (quên chấm, chấm nhầm). Giờ hiểu theo giờ Việt Nam; bản ghi sửa xong đánh dấu "Quản lý sửa". */
export function EditAttendanceDialog({ record, staffName, onClose, onSaved }: { record: Attendance; staffName: string; onClose: () => void; onSaved: () => void }) {
  const [clockIn, setClockIn] = useState(toLocalInput(record.clockInAt, defaultTimeZone));
  const [clockOut, setClockOut] = useState(record.clockOutAt ? toLocalInput(record.clockOutAt, defaultTimeZone) : "");
  const [note, setNote] = useState(record.note ?? "");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);

  const inIso = fromLocalInput(clockIn, defaultTimeZone);
  const outIso = clockOut ? fromLocalInput(clockOut, defaultTimeZone) : null;
  const inError = !inIso ? "Chọn giờ vào ca." : undefined;
  const outError = clockOut && !outIso ? "Giờ ra ca không hợp lệ." : outIso && inIso && Date.parse(outIso) <= Date.parse(inIso) ? "Giờ ra phải sau giờ vào." : undefined;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (inError || outError || !inIso) return;
    setBusy(true);
    setProblem(null);
    const result = await call(() => api.PUT("/attendance/{attendanceId}", { params: { path: { attendanceId: record.id } }, body: { clockInAt: inIso, clockOutAt: outIso, note: note.trim() || null } }));
    setBusy(false);
    if (!result.ok) return setProblem(result.problem);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sửa chấm công</DialogTitle>
          <DialogDescription>{staffName} — dùng khi quên chấm hoặc chấm nhầm giờ.</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
          {problem && (
            <Alert variant="destructive">
              <AlertDescription>{problemMessage(problem)}</AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="att-in" label="Vào ca" error={inError}>
              <Input id="att-in" type="datetime-local" value={clockIn} onChange={(e) => setClockIn(e.target.value)} aria-invalid={!!inError} aria-describedby={describedBy("att-in", inError)} className="h-11 sm:h-10" />
            </Field>
            <Field id="att-out" label="Ra ca" hint="Để trống nếu còn trong ca." error={outError}>
              <Input id="att-out" type="datetime-local" value={clockOut} onChange={(e) => setClockOut(e.target.value)} aria-invalid={!!outError} aria-describedby={describedBy("att-out", outError, true)} className="h-11 sm:h-10" />
            </Field>
          </div>
          <Field id="att-note" label="Lý do sửa (không bắt buộc)">
            <Textarea id="att-note" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: quên chấm ra ca" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy} className="h-11 sm:h-9">
              Hủy
            </Button>
            <Button type="submit" disabled={busy || !!inError || !!outError} className="h-11 sm:h-9">
              {busy && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
              {busy ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
