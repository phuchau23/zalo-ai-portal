"use client";

import { useState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { dayLongNames, dayOrder, groupHoursByDay, validateWindows, type DayWindow } from "@/lib/crm";

type Row = DayWindow & { key: number };

let rowKey = 0;
const toRows = (value: DayWindow[]): Row[] => value.map((w) => ({ key: ++rowKey, ...w }));

/**
 * Khung giờ theo thứ trong tuần (giờ mở cửa chi nhánh, ca cố định nhân viên).
 * Mỗi ngày có thể nhiều khung; không có khung = nghỉ. Kiểm tra định dạng, thứ tự, chồng nhau trước khi gọi `onSave`.
 */
export function WeekWindowsEditor({
  idPrefix,
  value,
  canEdit,
  title,
  description,
  emptyLabel = "Nghỉ",
  saveLabel = "Lưu",
  onSave,
}: {
  idPrefix: string;
  value: DayWindow[];
  canEdit: boolean;
  title: string;
  description?: string;
  emptyLabel?: string;
  saveLabel?: string;
  /** Trả về problem nếu BE từ chối, null nếu lưu xong. */
  onSave: (rows: DayWindow[]) => Promise<ApiProblem | null>;
}) {
  const [rows, setRows] = useState<Row[]>(() => toRows(value));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problem, setProblem] = useState<ApiProblem | null>(null);

  // Dữ liệu từ BE đổi (tải lại) → thay danh sách đang sửa. Mẫu "điều chỉnh state khi prop đổi" của React, không dùng effect.
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setRows(toRows(value));
  }

  const byDay = groupHoursByDay(rows);
  const touch = (next: Row[]) => {
    setRows(next);
    setSaved(false);
    setError(null);
    setProblem(null);
  };

  function addRow(day: number) {
    const last = byDay[day].at(-1);
    touch([...rows, { key: ++rowKey, dayOfWeek: day, start: last ? last.end : "08:00", end: last ? "21:00" : "17:00" }]);
  }

  async function save() {
    const invalid = validateWindows(rows);
    if (invalid) return setError(invalid);
    setSaving(true);
    setProblem(null);
    const result = await onSave(rows.map(({ dayOfWeek, start, end }) => ({ dayOfWeek, start, end })));
    setSaving(false);
    if (result) return setProblem(result);
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <ul className="flex flex-col divide-y rounded-md border bg-background">
        {dayOrder.map((day) => (
          <li key={day} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-start">
            <span className="w-24 shrink-0 pt-2 text-sm font-medium">{dayLongNames[day]}</span>
            <div className="flex flex-1 flex-col gap-2">
              {byDay[day].length === 0 && <span className="pt-2 text-sm text-muted-foreground">{emptyLabel}</span>}
              {byDay[day].map((row) => (
                <div key={row.key} className="flex flex-wrap items-center gap-2">
                  <Label htmlFor={`${idPrefix}-${row.key}-start`} className="sr-only">
                    Bắt đầu {dayLongNames[day]}
                  </Label>
                  <Input
                    id={`${idPrefix}-${row.key}-start`}
                    type="time"
                    step={300}
                    value={row.start}
                    disabled={!canEdit}
                    onChange={(e) => touch(rows.map((r) => (r.key === row.key ? { ...r, start: e.target.value } : r)))}
                    className="h-11 w-28 sm:h-9"
                  />
                  <span className="text-sm text-muted-foreground">đến</span>
                  <Label htmlFor={`${idPrefix}-${row.key}-end`} className="sr-only">
                    Kết thúc {dayLongNames[day]}
                  </Label>
                  <Input
                    id={`${idPrefix}-${row.key}-end`}
                    type="time"
                    step={300}
                    value={row.end}
                    disabled={!canEdit}
                    onChange={(e) => touch(rows.map((r) => (r.key === row.key ? { ...r, end: e.target.value } : r)))}
                    className="h-11 w-28 sm:h-9"
                  />
                  {canEdit && (
                    <Button type="button" variant="ghost" size="icon-sm" className="size-11 sm:size-8" aria-label="Bỏ khung giờ" onClick={() => touch(rows.filter((r) => r.key !== row.key))}>
                      <Trash2 />
                    </Button>
                  )}
                </div>
              ))}
              {canEdit && (
                <Button type="button" variant="link" size="sm" className="h-9 w-fit px-0 sm:h-7" onClick={() => addRow(day)}>
                  <Plus aria-hidden />
                  Thêm khung giờ
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {(error || problem) && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {error ?? (problem && (Object.values(problem.fieldErrors)[0] ?? problemMessage(problem)))}
        </p>
      )}
      {canEdit && (
        <div className="flex items-center gap-3">
          <Button type="button" size="sm" className="h-11 sm:h-8" disabled={saving} onClick={() => void save()}>
            {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
            {saving ? "Đang lưu..." : saveLabel}
          </Button>
          {saved && (
            <span role="status" className="inline-flex items-center gap-1.5 text-sm text-success">
              <CircleCheck className="size-4" aria-hidden />
              Đã lưu
            </span>
          )}
        </div>
      )}
    </div>
  );
}
