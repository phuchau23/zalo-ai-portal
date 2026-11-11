import { describe, expect, it } from "vitest";
import type { KnowledgeDiffItem } from "@/lib/api/client";
import { decide, initialDecisions, lockedMissingKeys, plannedCounts, setAll, toSelections } from "./selection";

function item(partial: Partial<KnowledgeDiffItem> & Pick<KnowledgeDiffItem, "key" | "type" | "code">): KnowledgeDiffItem {
  return {
    kind: "service",
    kindLabel: "Dịch vụ",
    title: partial.code,
    existingCode: null,
    existingTitle: null,
    similarity: null,
    defaultSelected: partial.type === "added" || partial.type === "changed",
    changes: [],
    ...partial,
  };
}

const items: KnowledgeDiffItem[] = [
  item({ key: "DV-60", type: "changed", code: "DV-60" }),
  item({ key: "DV-NEW", type: "added", code: "DV-NEW" }),
  item({ key: "DV-90P", type: "possibleDuplicate", code: "DV-90P", existingCode: "DV-90" }),
  item({ key: "missing:DV-90", type: "missing", code: "DV-90", existingCode: "DV-90" }),
  item({ key: "missing:DV-XONG", type: "missing", code: "DV-XONG", existingCode: "DV-XONG" }),
];

describe("import selection", () => {
  it("defaults match backend: added/changed selected, duplicate and missing not", () => {
    const d = initialDecisions(items);
    expect(toSelections(items, d)).toEqual([{ key: "DV-60", resolution: null }, { key: "DV-NEW", resolution: null }]);
  });

  it("choosing merge locks and unselects deleting the merge target", () => {
    let d = setAll(items, initialDecisions(items), "missing", "apply");
    expect(d["missing:DV-90"]).toBe("apply");

    d = decide(items, d, "DV-90P", "merge");

    expect(lockedMissingKeys(items, d)).toEqual(new Set(["missing:DV-90"]));
    expect(d["missing:DV-90"]).toBe("skip");
    expect(d["missing:DV-XONG"]).toBe("apply");
    expect(toSelections(items, d)).toEqual([
      { key: "DV-60", resolution: null },
      { key: "DV-NEW", resolution: null },
      { key: "DV-90P", resolution: "merge" },
      { key: "missing:DV-XONG", resolution: null },
    ]);
  });

  it("select all skips locked items", () => {
    let d = decide(items, initialDecisions(items), "DV-90P", "merge");
    d = setAll(items, d, "missing", "apply");

    expect(d["missing:DV-90"]).toBe("skip");
    expect(d["missing:DV-XONG"]).toBe("apply");
  });

  it("counts planned changes", () => {
    let d = decide(items, initialDecisions(items), "DV-90P", "keepBoth");
    d = decide(items, d, "missing:DV-XONG", "apply");

    expect(plannedCounts(items, d)).toEqual({ added: 2, updated: 1, merged: 0, deleted: 1 });
  });
});
