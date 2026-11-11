import { describe, expect, it } from "vitest";
import {
  clockLabel,
  deltaPercent,
  durationLabel,
  heatLevel,
  heatmapGrid,
  matchPreset,
  minutesBetween,
  monthLabel,
  niceScale,
  periodLabel,
  periodLongLabel,
  presetRange,
  previousRange,
  rangeDays,
  rangeFromQuery,
  rangeLabel,
  shares,
  shiftMonth,
  sortBy,
  suggestedGroupBy,
  tickIndexes,
  vnToday,
} from "./reports";

// 2026-11-06 01:30 giờ VN = 2026-11-05 18:30 UTC → hôm nay ở VN vẫn là 06/11.
const now = Date.UTC(2026, 10, 5, 18, 30);

describe("khoảng ngày", () => {
  it("lấy ngày theo giờ Việt Nam", () => {
    expect(vnToday(now)).toBe("2026-11-06");
  });

  it("mốc chọn nhanh tính cả hôm nay", () => {
    expect(presetRange("7d", now)).toEqual({ from: "2026-10-31", to: "2026-11-06" });
    expect(presetRange("month", now)).toEqual({ from: "2026-11-01", to: "2026-11-06" });
    expect(presetRange("lastMonth", now)).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(rangeDays(presetRange("30d", now))).toBe(30);
  });

  it("tháng trước của tháng 1 là tháng 12 năm trước", () => {
    expect(presetRange("lastMonth", Date.UTC(2027, 0, 10))).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });

  it("nhận ra mốc đang chọn", () => {
    expect(matchPreset({ from: "2026-10-31", to: "2026-11-06" }, now)).toBe("7d");
    expect(matchPreset({ from: "2026-10-30", to: "2026-11-06" }, now)).toBeNull();
  });

  it("đọc khoảng từ URL, sai thì dùng mặc định, ngược thì đảo", () => {
    const fallback = { from: "2026-10-08", to: "2026-11-06" };
    expect(rangeFromQuery("2026-11-01", "2026-11-03", fallback)).toEqual({ from: "2026-11-01", to: "2026-11-03" });
    expect(rangeFromQuery("2026-11-05", "2026-11-01", fallback)).toEqual({ from: "2026-11-01", to: "2026-11-05" });
    expect(rangeFromQuery("hôm qua", "2026-11-01", fallback)).toBe(fallback);
  });

  it("kỳ trước cùng độ dài, liền trước", () => {
    expect(previousRange({ from: "2026-11-01", to: "2026-11-07" })).toEqual({ from: "2026-10-25", to: "2026-10-31" });
  });

  it("nhãn khoảng ngày gọn", () => {
    expect(rangeLabel({ from: "2026-10-08", to: "2026-11-06" })).toBe("08/10 – 06/11/2026");
    expect(rangeLabel({ from: "2025-12-20", to: "2026-01-02" })).toBe("20/12/2025 – 02/01/2026");
    expect(rangeLabel({ from: "2026-11-06", to: "2026-11-06" })).toBe("06/11/2026");
  });
});

describe("kỳ của biểu đồ", () => {
  it("chọn cách gộp theo độ dài khoảng", () => {
    expect(suggestedGroupBy({ from: "2026-10-08", to: "2026-11-06" })).toBe("day");
    expect(suggestedGroupBy({ from: "2026-08-08", to: "2026-11-06" })).toBe("week");
    expect(suggestedGroupBy({ from: "2025-11-06", to: "2026-11-06" })).toBe("month");
  });

  it("nhãn ngắn và dài", () => {
    expect(periodLabel("2026-11-03", "day")).toBe("03/11");
    expect(periodLabel("2026-11", "month")).toBe("T11/26");
    expect(periodLongLabel("2026-11-03", "day")).toBe("Thứ ba, 03/11/2026");
    expect(periodLongLabel("2026-11-02", "week")).toBe("Tuần từ 02/11/2026");
    expect(periodLongLabel("2026-11", "month")).toBe("Tháng 11/2026");
  });
});

describe("số liệu", () => {
  it("% thay đổi, kỳ trước 0 thì không so", () => {
    expect(deltaPercent(120, 100)).toBe(20);
    expect(deltaPercent(80, 100)).toBe(-20);
    expect(deltaPercent(5, 0)).toBeNull();
    expect(deltaPercent(1, 3)).toBe(-66.7);
  });

  it("tỷ lệ từng phần", () => {
    expect(shares([50, 30, 20])).toEqual([50, 30, 20]);
    expect(shares([0, 0])).toEqual([0, 0]);
  });

  it("thang trục đẹp, đỉnh không thấp hơn giá trị lớn nhất", () => {
    expect(niceScale(9_300_000)).toEqual({ top: 10_000_000, ticks: [0, 2_500_000, 5_000_000, 7_500_000, 10_000_000] });
    expect(niceScale(7)).toEqual({ top: 8, ticks: [0, 2, 4, 6, 8] });
    expect(niceScale(0).ticks).toHaveLength(5);
  });

  it("nhãn trục ngang thưa dần nhưng luôn có đầu và cuối", () => {
    expect(tickIndexes(5, 8)).toEqual([0, 1, 2, 3, 4]);
    const idx = tickIndexes(30, 6);
    expect(idx[0]).toBe(0);
    expect(idx.at(-1)).toBe(29);
    expect(idx.length).toBeLessThanOrEqual(6);
  });

  it("sắp xếp ổn định, chữ theo tiếng Việt", () => {
    const rows = [{ n: "Đào", v: 2 }, { n: "An", v: 2 }, { n: "Bình", v: 5 }];
    expect(sortBy(rows, (r) => r.v, "desc").map((r) => r.n)).toEqual(["Bình", "Đào", "An"]);
    expect(sortBy(rows, (r) => r.n, "asc").map((r) => r.n)).toEqual(["An", "Bình", "Đào"]);
  });
});

describe("bản đồ nhiệt", () => {
  it("T2 → CN, giờ tối thiểu 8h–20h, mở rộng khi có lịch ngoài khung", () => {
    const grid = heatmapGrid([
      { day: 1, hour: 9, appointments: 3 },
      { day: 0, hour: 21, appointments: 1 },
    ]);
    expect(grid.rows.map((r) => r.day)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(grid.hours[0]).toBe(8);
    expect(grid.hours.at(-1)).toBe(21);
    expect(grid.rows[0].values[1]).toBe(3);
    expect(grid.max).toBe(3);
    expect(grid.total).toBe(4);
  });

  it("mức đậm 0..4", () => {
    expect(heatLevel(0, 10)).toBe(0);
    expect(heatLevel(1, 10)).toBe(1);
    expect(heatLevel(10, 10)).toBe(4);
  });
});

describe("tháng và thời gian", () => {
  it("lùi/tiến tháng qua năm", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", 2)).toBe("2027-01");
    expect(monthLabel("2026-11")).toBe("Tháng 11/2026");
  });

  it("thời lượng ca", () => {
    expect(minutesBetween("2026-11-06T01:00:00Z", "2026-11-06T08:30:00Z", 0)).toBe(450);
    expect(durationLabel(450)).toBe("7 giờ 30 phút");
    expect(durationLabel(45)).toBe("45 phút");
    expect(durationLabel(120)).toBe("2 giờ");
    expect(clockLabel(7509)).toBe("02:05:09");
  });
});
