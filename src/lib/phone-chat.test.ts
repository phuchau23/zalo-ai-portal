import { describe, expect, it } from "vitest";
import { initials, sideOf, timeLabel, toRows, type PhoneMessage } from "./phone-chat";

const msg = (id: string, sender: string, at: string): PhoneMessage => ({ id, sender, text: id, createdAt: at });

describe("toRows", () => {
  it("groups consecutive bubbles by side and inserts time rows on gaps", () => {
    const rows = toRows([
      msg("a", "customer", "2026-10-14T03:00:00Z"),
      msg("b", "bot", "2026-10-14T03:00:05Z"),
      msg("c", "bot", "2026-10-14T03:00:06Z"),
      msg("d", "staff", "2026-10-14T03:00:30Z"),
      msg("e", "customer", "2026-10-14T03:30:00Z"),
    ]);
    expect(rows.map((r) => (r.kind === "time" ? `time:${r.label}` : r.key))).toEqual(["time:10:00 14/10", "a", "b", "c", "d", "time:10:30", "e"]);
    const bubbles = rows.flatMap((r) => (r.kind === "bubble" ? [r.bubble] : []));
    expect(bubbles.map((b) => [b.id, b.side, b.firstOfGroup, b.lastOfGroup])).toEqual([
      ["a", "me", true, true],
      ["b", "oa", true, false],
      ["c", "oa", false, false],
      ["d", "oa", false, true],
      ["e", "me", true, true],
    ]);
  });
});

describe("helpers", () => {
  it("treats every business-side sender as the OA", () => {
    expect(sideOf("customer")).toBe("me");
    expect(sideOf("system")).toBe("oa");
  });
  it("formats Vietnam time", () => expect(timeLabel("2026-10-14T16:05:00Z")).toBe("23:05"));
  it("builds initials", () => {
    expect(initials("Khoa Học Huyệt Đạo")).toBe("KĐ");
    expect(initials("Spa")).toBe("S");
    expect(initials("  ")).toBe("?");
  });
});
