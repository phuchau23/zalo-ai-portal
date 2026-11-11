"use client";

import { useState } from "react";
import { CalendarRange, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { isDay, matchPreset, presetRange, presets, rangeDays, rangeLabel, vnToday, type DateRange, type PresetKey } from "@/lib/reports";
import { cn } from "@/lib/utils";

/**
 * Chọn khoảng thời gian: mốc nhanh (Hôm nay, 7/30/90 ngày, tháng này, tháng trước) + tự chọn từ ngày – đến ngày.
 * Nút hiện tên mốc + khoảng ngày cụ thể để người xem không phải đoán "30 ngày qua" là từ ngày nào.
 * `exclude`: ẩn mốc không hợp (ví dụ "Hôm nay" cho biểu đồ theo ngày).
 */
export function PeriodPicker({
  value,
  onChange,
  now,
  exclude = [],
  maxDays = 366,
  className,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  now: number;
  exclude?: PresetKey[];
  maxDays?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const current = matchPreset(value, now);
  const today = vnToday(now);
  const options = presets.filter((p) => !exclude.includes(p.key));

  const draftValid = isDay(draft.from) && isDay(draft.to) && draft.from <= draft.to && draft.to <= today && rangeDays(draft) <= maxDays;
  const draftError =
    !isDay(draft.from) || !isDay(draft.to) ? "Chọn đủ hai ngày."
    : draft.from > draft.to ? "Ngày bắt đầu phải trước ngày kết thúc."
    : draft.to > today ? "Không chọn ngày trong tương lai."
    : rangeDays(draft) > maxDays ? `Tối đa ${maxDays} ngày.`
    : null;

  function choose(range: DateRange) {
    onChange(range);
    setOpen(false);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(value);
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("h-11 justify-between gap-2 rounded-xl bg-card px-3 shadow-card sm:h-10", className)}>
          <CalendarRange className="text-primary" aria-hidden />
          <span className="flex min-w-0 flex-col items-start leading-tight sm:flex-row sm:items-center sm:gap-2">
            <span className="text-sm font-semibold">{current ? presets.find((p) => p.key === current)!.label : "Tùy chọn"}</span>
            <span className="text-xs font-normal text-muted-foreground tabular-nums">{rangeLabel(value)}</span>
          </span>
          <ChevronDown className="ml-auto text-muted-foreground" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] gap-0 rounded-2xl p-0 shadow-card-hover">
        <div className="grid grid-cols-2 gap-1 p-2" role="group" aria-label="Chọn nhanh khoảng thời gian">
          {options.map((p) => {
            const active = current === p.key;
            return (
              <button
                key={p.key}
                type="button"
                aria-pressed={active}
                onClick={() => choose(presetRange(p.key, now))}
                className={cn(
                  "flex min-h-10 cursor-pointer items-center justify-between rounded-lg px-3 text-left text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  active ? "bg-primary/10 font-semibold text-primary" : "hover:bg-muted",
                )}
              >
                {p.label}
                {active && <Check className="size-4" aria-hidden />}
              </button>
            );
          })}
        </div>
        <form
          className="flex flex-col gap-3 border-t p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (draftValid) choose(draft);
          }}
        >
          <p className="text-xs font-medium text-muted-foreground">Tự chọn</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="period-from" className="text-xs">
                Từ ngày
              </Label>
              <Input id="period-from" type="date" max={today} value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} aria-invalid={!!draftError} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="period-to" className="text-xs">
                Đến ngày
              </Label>
              <Input id="period-to" type="date" max={today} value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} aria-invalid={!!draftError} />
            </div>
          </div>
          {draftError && (
            <p role="alert" className="text-xs text-destructive">
              {draftError}
            </p>
          )}
          <Button type="submit" size="sm" disabled={!draftValid} className="h-10 sm:h-8">
            Xem khoảng này
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
