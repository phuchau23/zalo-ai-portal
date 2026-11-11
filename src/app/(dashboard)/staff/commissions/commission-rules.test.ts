import { describe, expect, it } from "vitest";
import { commissionAmount, rulePriority, ruleValueLabel } from "./commission-rules";

describe("quy tắc hoa hồng", () => {
  it("tính giống BE: % làm tròn xuống, cố định giữ nguyên", () => {
    expect(commissionAmount("percent", 20, 450_000)).toBe(90_000);
    expect(commissionAmount("percent", 7, 333_333)).toBe(23_333);
    expect(commissionAmount("fixed", 50_000, 2_000_000)).toBe(50_000);
  });

  it("nhãn mức", () => {
    expect(ruleValueLabel("percent", 10)).toBe("10%");
    expect(ruleValueLabel("fixed", 50_000)).toBe("50.000 đ");
  });

  it("ưu tiên: mục cụ thể > loại > mọi thứ; riêng người > chung", () => {
    const ordered = [
      { scope: "all", staffMemberId: null },
      { scope: "service", staffMemberId: null },
      { scope: "service", staffMemberId: "lan" },
      { scope: "item", staffMemberId: null },
      { scope: "all", staffMemberId: "lan" },
    ].sort((a, b) => rulePriority(a) - rulePriority(b));
    expect(ordered.map((r) => `${r.scope}:${r.staffMemberId ?? "-"}`)).toEqual(["item:-", "service:lan", "service:-", "all:lan", "all:-"]);
  });
});
