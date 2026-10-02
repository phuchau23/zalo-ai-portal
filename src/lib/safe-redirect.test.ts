import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it.each(["/", "/settings", "/settings?tab=bot"])("allows internal path %s", (path) => {
    expect(safeRedirectPath(path)).toBe(path);
  });

  it.each(["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "", undefined, ["/a"]])(
    "rejects %s",
    (path) => {
      expect(safeRedirectPath(path)).toBe("/");
    },
  );
});
