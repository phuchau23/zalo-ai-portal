import { describe, expect, it } from "vitest";
import { runPositions } from "./thread";

const at = (minute: number) => new Date(2026, 9, 29, 10, minute).toISOString();

describe("runPositions", () => {
  it("groups consecutive messages from the same sender within five minutes", () => {
    expect(
      runPositions([
        { sender: "customer", createdAt: at(0) },
        { sender: "customer", createdAt: at(1) },
        { sender: "bot", createdAt: at(2) },
        { sender: "bot", createdAt: at(3) },
        { sender: "bot", createdAt: at(4) },
        { sender: "bot", createdAt: at(30) },
      ]),
    ).toEqual(["first", "last", "first", "middle", "last", "single"]);
  });

  it("keeps system messages on their own", () => {
    expect(
      runPositions([
        { sender: "system", createdAt: at(0) },
        { sender: "system", createdAt: at(1) },
      ]),
    ).toEqual(["single", "single"]);
  });
});
