import { describe, expect, it } from "vitest";
import { expiryState, formatVnDate, isoToVnDate, monthLabel, quotaLabel, tenantStatusLabel, vnDateToIso } from "./admin";

const now = Date.parse("2026-10-14T03:00:00Z"); // 10:00 sáng 14/10 giờ VN

describe("expiryState", () => {
  it("is none without expiry or when far away", () => {
    expect(expiryState(null, now)).toEqual({ kind: "none" });
    expect(expiryState("2026-12-31T16:59:59Z", now)).toEqual({ kind: "none" });
  });
  it("warns within 7 calendar days", () => {
    expect(expiryState("2026-10-21T16:59:59Z", now)).toEqual({ kind: "soon", daysLeft: 7 });
    expect(expiryState("2026-10-14T16:59:59Z", now)).toEqual({ kind: "soon", daysLeft: 0 });
  });
  it("reports days over once expired", () => {
    expect(expiryState("2026-10-11T16:59:59Z", now)).toEqual({ kind: "expired", daysOver: 3 });
  });
});

describe("dates", () => {
  it("maps a date input to the end of that Vietnam day", () => {
    expect(vnDateToIso("2026-11-30")).toBe("2026-11-30T23:59:59+07:00");
    expect(vnDateToIso("")).toBeNull();
    expect(isoToVnDate("2026-11-30T16:59:59Z")).toBe("2026-11-30");
    expect(isoToVnDate(null)).toBe("");
    expect(formatVnDate("2026-11-30T16:59:59Z")).toBe("30/11/2026");
  });
  it("labels months", () => expect(monthLabel("2026-01-01")).toBe("1/2026"));
});

describe("labels", () => {
  it("names tenant status", () => {
    expect(tenantStatusLabel("active", null)).toBe("Đang hoạt động");
    expect(tenantStatusLabel("suspended", "expired")).toBe("Tự khóa (quá hạn)");
    expect(tenantStatusLabel("suspended", "manual")).toBe("Đã khóa");
  });
  it("shows quota usage", () => {
    expect(quotaLabel(12, 100)).toBe("12/100");
    expect(quotaLabel(12, null)).toBe("12 / không giới hạn");
  });
});
