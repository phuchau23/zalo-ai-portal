import { describe, expect, it } from "vitest";
import { areaPath, monotonePath } from "./geometry";

/** Lấy mọi tọa độ y (kể cả điểm điều khiển) trong chuỗi path. */
function ys(path: string): number[] {
  return [...path.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[2]));
}

describe("monotonePath", () => {
  it("rỗng / một điểm / hai điểm", () => {
    expect(monotonePath([])).toBe("");
    expect(monotonePath([{ x: 0, y: 5 }])).toBe("M0,5");
    expect(monotonePath([{ x: 0, y: 5 }, { x: 10, y: 0 }])).toBe("M0,5L10,0");
  });

  it("không vọt quá đáy khi số liệu chạm 0 (y lớn nhất = đáy trục)", () => {
    // Trục SVG: y = 100 là giá trị 0. Có đỉnh nhọn rồi về 0 → điểm điều khiển không được vượt 100.
    const path = monotonePath([
      { x: 0, y: 100 },
      { x: 10, y: 10 },
      { x: 20, y: 100 },
      { x: 30, y: 100 },
    ]);
    expect(Math.max(...ys(path))).toBeLessThanOrEqual(100);
    expect(Math.min(...ys(path))).toBeGreaterThanOrEqual(10);
  });

  it("vùng tô khép về đáy", () => {
    expect(areaPath([{ x: 0, y: 5 }, { x: 10, y: 0 }], 50)).toBe("M0,5L10,0L10,50L0,50Z");
  });
});
