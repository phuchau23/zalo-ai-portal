import { describe, expect, it } from "vitest";
import { documentTitle, elapsed, priorityOf } from "./inbox-utils";

describe("priorityOf", () => {
  it("ranks urgent waiting customers highest", () => {
    expect(priorityOf({ urgency: "urgent", needsAttentionSince: "2026-10-04T10:00:00Z", mode: "human" })).toBe("urgent");
    expect(priorityOf({ urgency: "none", needsAttentionSince: "2026-10-04T10:00:00Z", mode: "human" })).toBe("attention");
    expect(priorityOf({ urgency: "none", needsAttentionSince: null, mode: "human" })).toBe("human");
    expect(priorityOf({ urgency: "none", needsAttentionSince: null, mode: "bot" })).toBe("bot");
  });
});

describe("elapsed", () => {
  const now = new Date("2026-10-04T12:00:00Z").getTime();
  it("formats waiting time", () => {
    expect(elapsed("2026-10-04T11:59:40Z", now)).toBe("vừa xong");
    expect(elapsed("2026-10-04T11:55:00Z", now)).toBe("5 phút");
    expect(elapsed("2026-10-04T09:00:00Z", now)).toBe("3 giờ");
    expect(elapsed("2026-10-01T12:00:00Z", now)).toBe("3 ngày");
    expect(elapsed(null, now)).toBe("");
  });
});

describe("documentTitle", () => {
  it("shows waiting count", () => {
    expect(documentTitle(0)).toBe("Hộp thư — Trợ lý Zalo AI");
    expect(documentTitle(3)).toBe("(3) Hộp thư — Trợ lý Zalo AI");
  });
});
