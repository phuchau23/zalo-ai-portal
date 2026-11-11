/** Hàm thuần cho trang /phone-test (giao diện chat như trên điện thoại của khách). */

export type PhoneMessage = { id: string; sender: string; text: string; createdAt: string };

/** "me" = khách (người đang thử); "oa" = mọi tin từ phía doanh nghiệp (bot, nhân viên, câu hệ thống) — khách thấy như nhau. */
export type Side = "me" | "oa";

export type Bubble = PhoneMessage & { side: Side; firstOfGroup: boolean; lastOfGroup: boolean };

export type Row = { kind: "time"; key: string; label: string } | { kind: "bubble"; key: string; bubble: Bubble };

/** Cách nhau quá khoảng này thì chen một dòng giờ (giống app chat). */
const TIME_GAP_MS = 10 * 60 * 1000;

export function sideOf(sender: string): Side {
  return sender === "customer" ? "me" : "oa";
}

/** Danh sách dòng hiển thị: dòng giờ khi cách quãng, bong bóng gom theo phía để chỉ hiện ảnh đại diện ở tin đầu nhóm. */
export function toRows(messages: PhoneMessage[]): Row[] {
  const rows: Row[] = [];
  messages.forEach((m, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const at = Date.parse(m.createdAt);
    const gap = !prev || at - Date.parse(prev.createdAt) > TIME_GAP_MS;
    if (gap) rows.push({ kind: "time", key: `t-${m.id}`, label: timeLabel(m.createdAt, !prev) });
    const side = sideOf(m.sender);
    const nextGap = next ? Date.parse(next.createdAt) - at > TIME_GAP_MS : true;
    rows.push({
      kind: "bubble",
      key: m.id,
      bubble: {
        ...m,
        side,
        firstOfGroup: gap || !prev || sideOf(prev.sender) !== side,
        lastOfGroup: !next || nextGap || sideOf(next.sender) !== side,
      },
    });
  });
  return rows;
}

/** "14:05" (giờ Việt Nam); dòng đầu tiên kèm ngày: "14:05 14/10". */
export function timeLabel(iso: string, withDate = false): string {
  const d = new Date(Date.parse(iso) + 7 * 60 * 60 * 1000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return withDate ? `${hh}:${mm} ${d.getUTCDate()}/${d.getUTCMonth() + 1}` : `${hh}:${mm}`;
}

/** Chữ cái đại diện cho ảnh OA: "Khoa Học Huyệt Đạo" → "KĐ". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  return ((words[0][0] ?? "") + (words.length > 1 ? (words.at(-1)?.[0] ?? "") : "")).toUpperCase();
}
