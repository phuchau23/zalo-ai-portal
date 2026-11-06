import { describe, expect, it } from "vitest";
import type { InboxMessage } from "@/lib/api/client";
import { buildThread, dayLabel, documentTitle, elapsed, matchesSearch, normalizeSearch, priorityOf } from "./inbox-utils";

// Giờ địa phương của máy chạy test, để nhãn "Hôm nay/Hôm qua" không lệch múi giờ.
const local = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute).toISOString();

function message(sender: string, createdAt: string, extra: Partial<InboxMessage> = {}): InboxMessage {
  return {
    id: `${sender}-${createdAt}`,
    sender,
    senderUserId: null,
    text: "x",
    createdAt,
    deliveryStatus: "sent",
    deliveryError: null,
    trace: null,
    proactive: false,
    ...extra,
  };
}

describe("search", () => {
  it("ignores case and Vietnamese diacritics", () => {
    expect(normalizeSearch("  Đặng Thị LAN ")).toBe("dang thi lan");
    expect(matchesSearch({ contactName: "Nguyễn Lân", lastMessagePreview: null }, "lan")).toBe(true);
    expect(matchesSearch({ contactName: "Khách ...3a14", lastMessagePreview: "Cho em hỏi giá gội đầu" }, "goi dau")).toBe(true);
    expect(matchesSearch({ contactName: "Kim", lastMessagePreview: "Chào" }, "lan")).toBe(false);
    expect(matchesSearch({ contactName: "Kim", lastMessagePreview: null }, "  ")).toBe(true);
  });
});

describe("dayLabel", () => {
  const now = new Date(2026, 9, 29, 15, 0).getTime(); // thứ Năm 29/10/2026
  it("names recent days", () => {
    expect(dayLabel(local(29, 8), now)).toBe("Hôm nay");
    expect(dayLabel(local(28, 23), now)).toBe("Hôm qua");
    expect(dayLabel(local(26, 9), now)).toBe("Thứ Hai, 26/10");
    expect(dayLabel(local(2, 9), now)).toBe("02/10/2026");
  });
});

describe("buildThread", () => {
  const now = new Date(2026, 9, 29, 15, 0).getTime();
  it("inserts day separators and groups consecutive messages from the same sender", () => {
    const thread = buildThread(
      [
        message("customer", local(28, 9, 0)),
        message("customer", local(28, 9, 1)),
        message("bot", local(28, 9, 2)),
        message("customer", local(29, 10, 0)),
        message("customer", local(29, 10, 2)),
        message("customer", local(29, 10, 3)),
        message("customer", local(29, 10, 30)),
        message("system", local(29, 10, 31)),
      ],
      now,
    );
    expect(thread.map((e) => (e.kind === "day" ? e.label : `${e.message.sender}:${e.position}`))).toEqual([
      "Hôm qua",
      "customer:first",
      "customer:last",
      "bot:single",
      "Hôm nay",
      "customer:first",
      "customer:middle",
      "customer:last",
      "customer:single",
      "system:single",
    ]);
  });

  it("does not group different staff members or proactive with normal bot messages", () => {
    const thread = buildThread(
      [
        message("staff", local(29, 9, 0), { senderUserId: "a" }),
        message("staff", local(29, 9, 1), { senderUserId: "b" }),
        message("bot", local(29, 9, 2), { proactive: true }),
        message("bot", local(29, 9, 3)),
      ],
      now,
    );
    expect(thread.filter((e) => e.kind === "message").map((e) => (e.kind === "message" ? e.position : ""))).toEqual([
      "single",
      "single",
      "single",
      "single",
    ]);
  });
});

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
