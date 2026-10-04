import { describe, expect, it } from "vitest";
import { confidenceLabel, formatUsd, formatVnd, guardLabel, handoffReasonLabel, leadFieldLabel } from "./labels";

describe("chat-test labels", () => {
  it("translates handoff reasons and keeps unknown codes", () => {
    expect(handoffReasonLabel("no_knowledge")).toBe("Chưa có dữ liệu để trả lời");
    expect(handoffReasonLabel("something_new")).toBe("something_new");
    expect(handoffReasonLabel(null)).toBe("");
  });

  it("maps confidence to tone", () => {
    expect(confidenceLabel("high").tone).toBe("success");
    expect(confidenceLabel("low").tone).toBe("warning");
    expect(confidenceLabel("weird").label).toBe("Không chắc");
  });

  it("lists forbidden phrases in the rewrite guard", () => {
    expect(guardLabel("forbidden_retry", ["trị dứt điểm"]).label).toContain('"trị dứt điểm"');
    expect(guardLabel("danger_keyword").tone).toBe("destructive");
    expect(guardLabel("unknown_guard").label).toBe("unknown_guard");
  });

  it("labels lead fields", () => {
    expect(leadFieldLabel("phone")).toBe("Số điện thoại");
    expect(leadFieldLabel("x")).toBe("x");
  });

  it("formats tiny costs", () => {
    expect(formatUsd(0)).toBe("$0");
    expect(formatUsd(0.00123)).toBe("$0.0012");
    expect(formatUsd(1.5)).toBe("$1.50");
    expect(formatVnd(0.01)).toBe("260đ");
  });
});
