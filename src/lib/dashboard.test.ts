import { describe, expect, it } from "vitest";
import { botRate, dayLabel, dayLongLabel, niceMax, unansweredReasonLabel } from "./dashboard";

describe("botRate", () => {
  it("returns null without conversations", () => expect(botRate(0, 0)).toBeNull());
  it("rounds to a whole percent", () => expect(botRate(2, 3)).toBe(67));
  it("never exceeds 100", () => expect(botRate(5, 4)).toBe(100));
});

describe("niceMax", () => {
  it.each([
    [0, 5],
    [3, 5],
    [7, 10],
    [12, 20],
    [48, 50],
    [51, 100],
    [230, 500],
  ])("%i → %i", (max, expected) => expect(niceMax(max)).toBe(expected));
});

describe("labels", () => {
  it("formats days", () => {
    expect(dayLabel("2026-10-04")).toBe("4/10");
    expect(dayLongLabel("2026-10-14")).toBe("Thứ Tư, 14/10");
  });
  it("names unanswered reasons", () => {
    expect(unansweredReasonLabel("low_confidence")).toBe("Bot không chắc");
    expect(unansweredReasonLabel("no_knowledge")).toBe("Thiếu dữ liệu");
  });
});
