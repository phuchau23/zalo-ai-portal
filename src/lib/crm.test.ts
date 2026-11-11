import { describe, expect, it } from "vitest";
import {
  branchName,
  dayNames,
  dayOrder,
  emptyToNull,
  formatDurationLabel,
  groupHoursByDay,
  hasPermission,
  hhmmToMinutes,
  isCatalogKind,
  isHHmm,
  isValidWindow,
  kindLabels,
  normalizeCode,
  parseOptionalInt,
  permissionLabel,
  permissionSummary,
  statusOf,
  branchStatusLabels,
  validateWindows,
  windowsOverlap,
} from "./crm";

describe("permissions", () => {
  it("labels known codes and falls back to the code", () => {
    expect(permissionLabel("manage_catalog")).toBe("Quản lý danh mục bán");
    expect(permissionLabel("something_new")).toBe("something_new");
  });

  it("summarises per role", () => {
    expect(permissionSummary("owner", [])).toBe("Toàn quyền");
    expect(permissionSummary("staff", [])).toBe("Chưa có quyền thêm");
    expect(permissionSummary("staff", ["a", "b", "c"])).toBe("3 quyền");
  });

  it("owner always passes, staff needs the code", () => {
    expect(hasPermission({ role: "owner", permissions: [] }, "refund")).toBe(true);
    expect(hasPermission({ role: "staff", permissions: ["refund"] }, "refund")).toBe(true);
    expect(hasPermission({ role: "staff", permissions: [] }, "refund")).toBe(false);
    expect(hasPermission({ role: "staff" }, "refund")).toBe(false);
    expect(hasPermission(null, "refund")).toBe(false);
  });
});

describe("days", () => {
  it("starts with Sunday like the BE and displays Monday first", () => {
    expect(dayNames[0]).toBe("CN");
    expect(dayNames[1]).toBe("T2");
    expect(dayOrder[0]).toBe(1);
    expect(dayOrder[6]).toBe(0);
  });
});

describe("catalog kinds", () => {
  it("has Vietnamese labels", () => {
    expect(kindLabels.service).toBe("Dịch vụ");
    expect(kindLabels.package).toBe("Gói liệu trình");
    expect(kindLabels.product).toBe("Sản phẩm");
  });

  it("guards unknown kinds", () => {
    expect(isCatalogKind("service")).toBe(true);
    expect(isCatalogKind("faq")).toBe(false);
    expect(isCatalogKind(undefined)).toBe(false);
  });
});

describe("time", () => {
  it("validates HH:mm", () => {
    expect(isHHmm("09:00")).toBe(true);
    expect(isHHmm("23:59")).toBe(true);
    expect(isHHmm("24:00")).toBe(false);
    expect(isHHmm("9:00")).toBe(false);
    expect(isHHmm("")).toBe(false);
  });

  it("converts to minutes", () => {
    expect(hhmmToMinutes("01:30")).toBe(90);
    expect(hhmmToMinutes("abc")).toBeNull();
  });

  it("requires start before end", () => {
    expect(isValidWindow("08:00", "12:00")).toBe(true);
    expect(isValidWindow("12:00", "12:00")).toBe(false);
    expect(isValidWindow("13:00", "12:00")).toBe(false);
  });

  it("detects overlap but allows touching windows", () => {
    expect(windowsOverlap({ start: "08:00", end: "12:00" }, { start: "11:00", end: "13:00" })).toBe(true);
    expect(windowsOverlap({ start: "08:00", end: "12:00" }, { start: "12:00", end: "13:00" })).toBe(false);
  });
});

describe("groupHoursByDay", () => {
  it("groups and sorts rows per day with every day present", () => {
    const grouped = groupHoursByDay([
      { dayOfWeek: 1, openTime: "13:00", closeTime: "17:00" },
      { dayOfWeek: 1, openTime: "08:00", closeTime: "12:00" },
      { dayOfWeek: 0, openTime: "09:00", closeTime: "11:00" },
      { dayOfWeek: 9, openTime: "09:00", closeTime: "11:00" },
    ]);
    expect(Object.keys(grouped)).toHaveLength(7);
    expect(grouped[1].map((r) => r.openTime)).toEqual(["08:00", "13:00"]);
    expect(grouped[0]).toHaveLength(1);
    expect(grouped[2]).toEqual([]);
  });

  it("also reads startTime rows (shift templates)", () => {
    const grouped = groupHoursByDay([
      { dayOfWeek: 3, startTime: "14:00", endTime: "18:00" },
      { dayOfWeek: 3, startTime: "08:00", endTime: "12:00" },
    ]);
    expect(grouped[3].map((r) => r.startTime)).toEqual(["08:00", "14:00"]);
  });
});

describe("validateWindows", () => {
  it("accepts valid non-overlapping windows", () => {
    expect(
      validateWindows([
        { dayOfWeek: 1, start: "08:00", end: "12:00" },
        { dayOfWeek: 1, start: "13:00", end: "17:00" },
        { dayOfWeek: 2, start: "08:00", end: "17:00" },
      ]),
    ).toBeNull();
  });

  it("reports format, order and overlap errors with the day name", () => {
    expect(validateWindows([{ dayOfWeek: 1, start: "8h", end: "12:00" }])).toContain("T2");
    expect(validateWindows([{ dayOfWeek: 0, start: "12:00", end: "08:00" }])).toContain("CN");
    expect(
      validateWindows([
        { dayOfWeek: 5, start: "08:00", end: "12:00" },
        { dayOfWeek: 5, start: "11:00", end: "13:00" },
      ]),
    ).toContain("chồng");
  });
});

describe("formatDurationLabel", () => {
  it("formats per kind", () => {
    expect(formatDurationLabel({ kind: "service", durationMinutes: 60 })).toBe("60 phút");
    expect(formatDurationLabel({ kind: "package", sessionCount: 5, durationMinutes: 90, validityDays: 180 })).toBe("5 buổi · 90 phút/buổi · hạn 180 ngày");
    expect(formatDurationLabel({ kind: "product", durationMinutes: 60 })).toBe("");
    expect(formatDurationLabel({ kind: "service", durationMinutes: null })).toBe("");
  });
});

describe("inputs", () => {
  it("normalizes codes to uppercase ASCII", () => {
    expect(normalizeCode("dv massage 60")).toBe("DV-MASSAGE-60");
    expect(normalizeCode("Gói Đẹp Da!")).toBe("GOI-DEP-DA");
    expect(normalizeCode("sp_01")).toBe("SP_01");
  });

  it("parses optional integers", () => {
    expect(parseOptionalInt("")).toBeNull();
    expect(parseOptionalInt(" 45 ")).toBe(45);
    expect(parseOptionalInt("45.9")).toBe(45);
    expect(parseOptionalInt("abc")).toBeNull();
  });

  it("maps empty strings to null", () => {
    expect(emptyToNull("  ")).toBeNull();
    expect(emptyToNull(" a ")).toBe("a");
    expect(emptyToNull(undefined)).toBeNull();
  });
});

describe("labels", () => {
  it("resolves branch names", () => {
    const branches = [{ id: "1", name: "Quận 1" }];
    expect(branchName(branches, null)).toBe("Mọi chi nhánh");
    expect(branchName(branches, "1")).toBe("Quận 1");
    expect(branchName(branches, "2")).toBe("(không rõ)");
  });

  it("falls back for unknown statuses", () => {
    expect(statusOf(branchStatusLabels, "active").label).toBe("Đang hoạt động");
    expect(statusOf(branchStatusLabels, "weird")).toEqual({ label: "weird", variant: "outline" });
  });
});
