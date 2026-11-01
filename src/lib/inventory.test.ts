import { describe, expect, it } from "vitest";
import { avgCostAfter, countDelta, countStatusOf, isLow, movementKindOf, purchaseStatusOf, purchaseTotal, signedQuantity } from "./inventory";

describe("labels", () => {
  it("maps movement kinds and statuses", () => {
    expect(movementKindOf("transfer_out").label).toBe("Chuyển đi");
    expect(movementKindOf("consume").label).toBe("Tiêu hao");
    expect(movementKindOf("x")).toEqual({ label: "x", variant: "outline" });
    expect(purchaseStatusOf("received").variant).toBe("success");
    expect(countStatusOf("applied").label).toBe("Đã áp dụng");
  });
});

describe("stock maths", () => {
  it("flags low stock only when a minimum is set", () => {
    expect(isLow(3, 5)).toBe(true);
    expect(isLow(5, 5)).toBe(true);
    expect(isLow(6, 5)).toBe(false);
    expect(isLow(0, null)).toBe(false);
  });

  it("computes weighted average cost", () => {
    expect(avgCostAfter(10, 100, 10, 200)).toBe(150);
    expect(avgCostAfter(0, 0, 5, 80)).toBe(80);
    expect(avgCostAfter(-2, 50, 5, 80)).toBe(80);
    expect(avgCostAfter(10, 100, 0, 999)).toBe(100);
  });

  it("totals purchase lines and count deltas", () => {
    expect(purchaseTotal([{ quantity: 2, unitCost: 10_000 }, { quantity: 0.5, unitCost: 100_000 }])).toBe(70_000);
    expect(countDelta({ expectedQuantity: 10, countedQuantity: 8 })).toBe(-2);
  });

  it("signs quantities for history", () => {
    expect(signedQuantity("purchase", 3)).toBe(3);
    expect(signedQuantity("sale", 2)).toBe(-2);
    expect(signedQuantity("transfer_in", 1)).toBe(1);
    expect(signedQuantity("adjust", -4)).toBe(-4);
    expect(signedQuantity("adjust", 4)).toBe(4);
  });
});
