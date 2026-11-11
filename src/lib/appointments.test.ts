import { describe, expect, it } from "vitest";
import {
  actorLabel,
  addDays,
  canCancel,
  canReschedule,
  dateKeyOf,
  eventKindLabel,
  formatDateTimeTz,
  formatDayLong,
  formatDayShort,
  formatTime,
  formatTimeRange,
  fromLocalInput,
  gridRange,
  gridSlots,
  groupSlots,
  isBriefPending,
  isDateKey,
  isTerminal,
  layoutBlocks,
  minutesOfDay,
  minutesToHHmm,
  nextStatuses,
  safeTimeZone,
  seriesErrorLabel,
  serviceNames,
  sourceLabel,
  splitByNow,
  statusBlockClass,
  statusLabel,
  toLocalInput,
  tzOffsetMinutes,
  weekDays,
  weekStart,
} from "./appointments";

const vn = "Asia/Ho_Chi_Minh";

describe("labels", () => {
  it("translates status, source, event kind and actor; unknown falls back to the code", () => {
    expect(statusLabel("booked")).toEqual({ label: "Đã đặt", variant: "secondary" });
    expect(statusLabel("done").variant).toBe("success");
    expect(statusLabel("no_show").variant).toBe("destructive");
    expect(statusLabel("weird")).toEqual({ label: "weird", variant: "outline" });
    expect(sourceLabel("bot")).toBe("Bot đặt qua chat");
    expect(sourceLabel("walk_in")).toBe("Khách đến trực tiếp");
    expect(eventKindLabel("reminder_skipped")).toBe("Không nhắc được (khách chỉ có SĐT)");
    expect(eventKindLabel("brief_written")).toBe("AI đã tóm tắt");
    expect(actorLabel("customer")).toBe("Khách");
    expect(seriesErrorLabel("slot_unavailable")).toBe("Kín giờ");
    expect(seriesErrorLabel(null)).toBe("");
  });

  it("uses token classes and strikes through cancelled", () => {
    expect(statusBlockClass("cancelled")).toContain("line-through");
    expect(statusBlockClass("confirmed")).toContain("primary");
    expect(statusBlockClass("unknown")).toContain("bg-muted");
  });
});

describe("status transitions", () => {
  it("marks terminal statuses", () => {
    expect(isTerminal("done")).toBe(true);
    expect(isTerminal("no_show")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("booked")).toBe(false);
  });

  it("follows arrived → in_progress → done", () => {
    expect(nextStatuses("booked")).toEqual(["arrived", "no_show"]);
    expect(nextStatuses("confirmed")).toEqual(["arrived", "no_show"]);
    expect(nextStatuses("arrived")).toEqual(["in_progress", "done"]);
    expect(nextStatuses("in_progress")).toEqual(["done"]);
    expect(nextStatuses("done")).toEqual([]);
  });

  it("allows reschedule/cancel only before service starts", () => {
    expect(canReschedule("booked")).toBe(true);
    expect(canReschedule("arrived")).toBe(false);
    expect(canCancel("arrived")).toBe(true);
    expect(canCancel("done")).toBe(false);
  });
});

describe("time zone helpers", () => {
  it("falls back to Vietnam for invalid zones", () => {
    expect(safeTimeZone("Not/AZone")).toBe(vn);
    expect(safeTimeZone("")).toBe(vn);
    expect(safeTimeZone("Asia/Bangkok")).toBe("Asia/Bangkok");
  });

  it("computes the offset", () => {
    expect(tzOffsetMinutes(vn, new Date("2026-10-15T02:30:00Z"))).toBe(420);
    expect(tzOffsetMinutes("UTC", new Date("2026-10-15T02:30:00Z"))).toBe(0);
  });

  it("converts to and from datetime-local strings in the business zone", () => {
    expect(toLocalInput("2026-10-15T02:30:00Z", vn)).toBe("2026-10-15T09:30");
    expect(toLocalInput("2026-10-14T17:00:00Z", vn)).toBe("2026-10-15T00:00");
    expect(fromLocalInput("2026-10-15T09:30", vn)).toBe("2026-10-15T09:30:00+07:00");
    expect(fromLocalInput("2026-10-15T09:30", "UTC")).toBe("2026-10-15T09:30:00+00:00");
    expect(fromLocalInput("2026-01-15T09:30", "America/New_York")).toBe("2026-01-15T09:30:00-05:00");
    expect(fromLocalInput("nope", vn)).toBeNull();
    expect(fromLocalInput("", vn)).toBeNull();
  });

  it("round-trips", () => {
    const iso = fromLocalInput("2026-10-15T14:45", vn);
    expect(iso).not.toBeNull();
    expect(toLocalInput(iso!, vn)).toBe("2026-10-15T14:45");
  });

  it("formats time, range and date-time", () => {
    expect(formatTime("2026-10-15T02:05:00Z", vn)).toBe("09:05");
    expect(formatTime(null, vn)).toBe("");
    expect(formatTimeRange("2026-10-15T02:00:00Z", "2026-10-15T03:30:00Z", vn)).toBe("09:00 – 10:30");
    expect(formatDateTimeTz("2026-10-15T02:05:00Z", vn)).toBe("09:05 15/10/2026");
    expect(dateKeyOf("2026-10-14T17:30:00Z", vn)).toBe("2026-10-15");
    expect(minutesOfDay("2026-10-15T02:30:00Z", vn)).toBe(570);
  });
});

describe("date keys", () => {
  it("validates and adds days", () => {
    expect(isDateKey("2026-10-15")).toBe(true);
    expect(isDateKey("2026-13-45")).toBe(false);
    expect(isDateKey("abc")).toBe(false);
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("builds Monday-first weeks", () => {
    // 2026-10-15 là thứ năm
    expect(weekStart("2026-10-15")).toBe("2026-10-12");
    expect(weekStart("2026-10-18")).toBe("2026-10-12"); // chủ nhật thuộc tuần bắt đầu 12/10
    expect(weekDays("2026-10-15")).toEqual(["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"]);
  });

  it("formats day labels", () => {
    expect(formatDayShort("2026-10-15")).toBe("T5 15/10");
    expect(formatDayShort("2026-10-18")).toBe("CN 18/10");
    expect(formatDayLong("2026-10-15")).toBe("Thứ năm, 15/10/2026");
  });
});

describe("grid", () => {
  it("spans earliest open to latest close rounded to hours, fallback 08–20", () => {
    expect(gridRange([{ openTime: "08:30", closeTime: "17:00" }, { openTime: "09:00", closeTime: "21:30" }])).toEqual({ startMinutes: 480, endMinutes: 1320 });
    expect(gridRange([])).toEqual({ startMinutes: 480, endMinutes: 1200 });
    expect(gridRange(null)).toEqual({ startMinutes: 480, endMinutes: 1200 });
  });

  it("lists slots and formats minutes", () => {
    expect(gridSlots({ startMinutes: 480, endMinutes: 600 }, 30)).toEqual([480, 510, 540, 570]);
    expect(gridSlots({ startMinutes: 480, endMinutes: 540 }, 0)).toEqual([480, 510]);
    expect(minutesToHHmm(570)).toBe("09:30");
  });

  it("positions blocks as percentages and clips to the grid", () => {
    const range = { startMinutes: 480, endMinutes: 1200 }; // 08:00–20:00 = 720 phút
    const blocks = layoutBlocks(
      [
        { id: "a", startAt: "2026-10-15T02:00:00Z", endAt: "2026-10-15T03:00:00Z" }, // 09:00–10:00
        { id: "b", startAt: "2026-10-14T23:00:00Z", endAt: "2026-10-15T01:30:00Z" }, // 06:00–08:30 → cắt còn 08:00–08:30
        { id: "c", startAt: "2026-10-15T14:00:00Z", endAt: "2026-10-15T15:00:00Z" }, // 21:00–22:00 → ngoài lưới
      ],
      range,
      vn,
    );
    expect(blocks).toEqual([
      { id: "a", top: 8.33, height: 8.33 },
      { id: "b", top: 0, height: 4.17 },
    ]);
  });

  it("keeps a minimum height for very short blocks", () => {
    const blocks = layoutBlocks([{ id: "x", startAt: "2026-10-15T02:00:00Z", endAt: "2026-10-15T02:05:00Z" }], { startMinutes: 0, endMinutes: 1440 }, vn);
    expect(blocks[0].height).toBe(2);
  });
});

describe("helpers", () => {
  it("joins service names", () => {
    expect(serviceNames([{ name: "Massage" }, { name: "Gội đầu" }])).toBe("Massage, Gội đầu");
  });

  it("groups availability slots by start time", () => {
    const groups = groupSlots([
      { staffMemberId: "s2", staffName: "Lan", startAt: "2026-10-15T03:00:00Z" },
      { staffMemberId: "s1", staffName: "Hoa", startAt: "2026-10-15T02:00:00Z" },
      { staffMemberId: "s2", staffName: "Lan", startAt: "2026-10-15T02:00:00Z" },
      { staffMemberId: "s2", staffName: "Lan", startAt: "2026-10-15T02:00:00.000Z" },
    ]);
    expect(groups.map((g) => g.startAt)).toEqual(["2026-10-15T02:00:00.000Z", "2026-10-15T03:00:00.000Z"]);
    expect(groups[0].staff.map((s) => s.name)).toEqual(["Hoa", "Lan"]);
  });

  it("knows when the AI brief is still being written", () => {
    const now = Date.parse("2026-10-15T02:10:00Z");
    expect(isBriefPending({ source: "bot", aiBrief: null }, "2026-10-15T02:08:00Z", now)).toBe(true);
    expect(isBriefPending({ source: "bot", aiBrief: null }, "2026-10-15T01:00:00Z", now)).toBe(false);
    expect(isBriefPending({ source: "staff", aiBrief: null }, "2026-10-15T02:08:00Z", now)).toBe(false);
    expect(isBriefPending({ source: "bot", aiBrief: "đã có" }, "2026-10-15T02:08:00Z", now)).toBe(false);
    expect(isBriefPending({ source: "bot", aiBrief: null }, null, now)).toBe(false);
  });

  it("splits upcoming and past, limiting past", () => {
    const now = Date.parse("2026-10-15T00:00:00Z");
    const list = Array.from({ length: 8 }, (_, i) => ({ startAt: `2026-10-0${i + 1}T00:00:00Z` })).concat([{ startAt: "2026-10-20T00:00:00Z" }, { startAt: "2026-10-16T00:00:00Z" }]);
    const { upcoming, past } = splitByNow(list, now, 5);
    expect(upcoming.map((a) => a.startAt)).toEqual(["2026-10-16T00:00:00Z", "2026-10-20T00:00:00Z"]);
    expect(past).toHaveLength(5);
    expect(past[0].startAt).toBe("2026-10-08T00:00:00Z");
  });
});
