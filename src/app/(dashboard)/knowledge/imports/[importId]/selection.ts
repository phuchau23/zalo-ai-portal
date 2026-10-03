import type { KnowledgeDiffItem } from "@/lib/api/client";

/** apply: áp dụng (thêm/đổi/xóa); skip: bỏ qua; merge/keepBoth: chỉ cho mục "có thể trùng". */
export type Decision = "apply" | "skip" | "merge" | "keepBoth";
export type Decisions = Record<string, Decision>;

/** Mặc định giống BE: thêm mới + thay đổi được chọn; có thể trùng + không còn trong file thì không. */
export function initialDecisions(items: KnowledgeDiffItem[]): Decisions {
  return Object.fromEntries(items.map((i) => [i.key, i.defaultSelected ? "apply" : "skip"]));
}

/**
 * Mục "không còn trong file" đang là đích gộp của một mục "có thể trùng" → không được chọn xóa
 * (BE cũng từ chối "vừa gộp vừa xóa"). Trả về key của các mục bị khóa.
 */
export function lockedMissingKeys(items: KnowledgeDiffItem[], decisions: Decisions): Set<string> {
  const mergeTargets = new Set(
    items.filter((i) => i.type === "possibleDuplicate" && decisions[i.key] === "merge").map((i) => i.existingCode),
  );
  return new Set(items.filter((i) => i.type === "missing" && mergeTargets.has(i.code)).map((i) => i.key));
}

/** Đổi quyết định một mục; chọn "gộp" thì tự bỏ chọn xóa mục đích. */
export function decide(items: KnowledgeDiffItem[], decisions: Decisions, key: string, decision: Decision): Decisions {
  const next = { ...decisions, [key]: decision };
  for (const locked of lockedMissingKeys(items, next)) next[locked] = "skip";
  return next;
}

export function setAll(items: KnowledgeDiffItem[], decisions: Decisions, type: string, decision: "apply" | "skip"): Decisions {
  const locked = lockedMissingKeys(items, decisions);
  const next = { ...decisions };
  for (const item of items) {
    if (item.type === type && !locked.has(item.key)) next[item.key] = decision;
  }

  return next;
}

/** Danh sách gửi lên POST /knowledge/imports/{id}/apply. */
export type Selection = { key: string; resolution: "merge" | "keepBoth" | null };

export function toSelections(items: KnowledgeDiffItem[], decisions: Decisions): Selection[] {
  return items.flatMap((item): Selection[] => {
    const decision = decisions[item.key] ?? "skip";
    if (item.type === "possibleDuplicate") {
      return decision === "merge" || decision === "keepBoth" ? [{ key: item.key, resolution: decision }] : [];
    }

    return decision === "apply" ? [{ key: item.key, resolution: null }] : [];
  });
}

export type PlannedCounts = { added: number; updated: number; merged: number; deleted: number };

export function plannedCounts(items: KnowledgeDiffItem[], decisions: Decisions): PlannedCounts {
  const counts: PlannedCounts = { added: 0, updated: 0, merged: 0, deleted: 0 };
  for (const item of items) {
    const decision = decisions[item.key];
    if (item.type === "added" && decision === "apply") counts.added++;
    if (item.type === "changed" && decision === "apply") counts.updated++;
    if (item.type === "possibleDuplicate" && decision === "merge") counts.merged++;
    if (item.type === "possibleDuplicate" && decision === "keepBoth") counts.added++;
    if (item.type === "missing" && decision === "apply") counts.deleted++;
  }

  return counts;
}
