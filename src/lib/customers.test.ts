import { describe, expect, it } from "vitest";
import { escalationLabel, followUpPresets, formatDay, formatVnTime, leadStatusOf, messagingWindow, outcomeLabel, parseTags, todayVn, toVnLocalInput, triggerLabel, vnLocalToIso } from "./customers";

const now = new Date("2026-10-04T03:00:00Z").getTime();
const hours = (h: number) => new Date(now + h * 60 * 60 * 1000).toISOString();

describe("messagingWindow", () => {
  it("no deadline (chat thử) can always message", () => {
    expect(messagingWindow({ messagingDeadline: null, freeUntil: null }, now)).toMatchObject({ canMessage: true, tone: "none" });
  });

  it("within 48h is free", () => {
    const w = messagingWindow({ messagingDeadline: hours(24 * 6), freeUntil: hours(20) }, now);
    expect(w.canMessage).toBe(true);
    expect(w.tone).toBe("ok");
    expect(w.text).toContain("6 ngày");
    expect(w.text).toContain("miễn phí thêm 20 giờ");
  });

  it("warns when less than 2 days left and outside free window", () => {
    const w = messagingWindow({ messagingDeadline: hours(30), freeUntil: hours(-10) }, now);
    expect(w.tone).toBe("soon");
    expect(w.text).toContain("có thể tính phí");
  });

  it("closed after deadline", () => {
    expect(messagingWindow({ messagingDeadline: hours(-1), freeUntil: hours(-100) }, now)).toMatchObject({ canMessage: false, tone: "closed" });
  });
});

describe("labels", () => {
  it("maps statuses, triggers and outcomes", () => {
    expect(leadStatusOf("hot").label).toBe("Nóng");
    expect(leadStatusOf("weird").label).toBe("weird");
    expect(triggerLabel("price_no_close")).toBe("Hỏi giá chưa chốt");
    expect(triggerLabel("unknown")).toBe("Cần hỏi thăm");
    expect(outcomeLabel("customer_replied")).toBe("Khách đã nhắn lại");
    expect(outcomeLabel(null)).toBeNull();
  });
});

describe("dates and tags", () => {
  it("today in Vietnam time", () => {
    expect(todayVn(new Date("2026-10-04T18:30:00Z").getTime())).toBe("2026-10-05");
  });

  it("formats day", () => {
    expect(formatDay("2026-10-12")).toBe("12/10/2026");
    expect(formatDay(null)).toBe("");
  });

  it("parses tags without duplicates", () => {
    expect(parseTags("VIP, vip , khách cũ,,", ["Vip"])).toEqual(["Vip", "khách cũ"]);
  });
});

describe("follow-up time (giờ Việt Nam)", () => {
  it("round-trips local input and ISO", () => {
    expect(toVnLocalInput(new Date("2026-10-04T02:30:00Z").getTime())).toBe("2026-10-04T09:30");
    expect(vnLocalToIso("2026-10-12T09:30")).toBe("2026-10-12T09:30:00+07:00");
    expect(vnLocalToIso("")).toBeNull();
    expect(formatVnTime("2026-10-12T02:30:00Z")).toBe("09:30 12/10/2026");
  });

  it("presets", () => {
    const presets = followUpPresets(new Date("2026-10-04T02:30:00Z").getTime());
    expect(presets.map((p) => p.value)).toEqual(["2026-10-04T09:35", "2026-10-05T09:00", "2026-10-11T09:00"]);
  });
});

describe("escalation labels", () => {
  it("maps known and unknown reasons", () => {
    expect(escalationLabel("outside_window")).toContain("gọi điện");
    expect(escalationLabel("weird")).toBe(escalationLabel("other"));
    expect(escalationLabel(null)).toBeNull();
  });
});
