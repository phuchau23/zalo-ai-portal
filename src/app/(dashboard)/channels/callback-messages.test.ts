import { describe, expect, it } from "vitest";
import { callbackNotice, connectionErrorLabel, isSendBlocked } from "./callback-messages";

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

  it("explains OA-level send blocks and flags them", () => {
    expect(connectionErrorLabel("zalo:-224")).toContain("chưa mua gói");
    expect(connectionErrorLabel("zalo:-221")).toContain("xác thực");
    expect(isSendBlocked("zalo:-224")).toBe(true);
    expect(isSendBlocked("zalo:-221")).toBe(true);
    expect(isSendBlocked("zalo:-220")).toBe(false);
    expect(isSendBlocked(null)).toBe(false);
  });
});
