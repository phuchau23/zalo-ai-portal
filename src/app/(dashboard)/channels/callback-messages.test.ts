import { describe, expect, it } from "vitest";
import { callbackNotice, connectionErrorLabel } from "./callback-messages";

describe("callbackNotice", () => {
  it("reports success", () => {
    expect(callbackNotice({ connected: "zalo" })?.tone).toBe("success");
  });

  it("maps known and Zalo error codes", () => {
    expect(callbackNotice({ error: "oa_in_use" })?.description).toContain("doanh nghiệp khác");
    expect(callbackNotice({ error: "zalo_-14014" })?.description).toContain("mã -14014");
    expect(callbackNotice({ error: "weird" })?.tone).toBe("error");
  });

  it("returns null without params", () => {
    expect(callbackNotice({})).toBeNull();
  });
});

describe("connectionErrorLabel", () => {
  it("explains token and permission errors", () => {
    expect(connectionErrorLabel("zalo:-220")).toContain("Mã truy cập");
    expect(connectionErrorLabel("zalo:-223")).toContain("thu hồi");
    expect(connectionErrorLabel(null)).toBeNull();
  });
});
