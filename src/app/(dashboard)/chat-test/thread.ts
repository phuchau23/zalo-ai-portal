import type { ChatMessage } from "@/lib/api/client";

/** Vị trí của một tin trong cụm tin liên tiếp cùng người gửi — quyết định bo góc, chỗ hiện ảnh đại diện và giờ. */
export type RunPosition = "single" | "first" | "middle" | "last";

/** Hai tin cùng người gửi cách nhau quá mức này thì tách cụm (hiện lại giờ). */
const runGapMs = 5 * 60_000;

function sameRun(a: Pick<ChatMessage, "sender" | "createdAt">, b: Pick<ChatMessage, "sender" | "createdAt">): boolean {
  if (a.sender !== b.sender || a.sender === "system") return false;
  const gap = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  return gap >= 0 && gap <= runGapMs;
}

/** Gom tin liên tiếp của cùng người gửi (cách nhau ≤ 5 phút) thành cụm, kiểu ứng dụng nhắn tin. Tin hệ thống luôn đứng riêng. */
export function runPositions(messages: Pick<ChatMessage, "sender" | "createdAt">[]): RunPosition[] {
  return messages.map((message, i) => {
    const joinsPrev = i > 0 && sameRun(messages[i - 1], message);
    const joinsNext = i < messages.length - 1 && sameRun(message, messages[i + 1]);
    return joinsPrev ? (joinsNext ? "middle" : "last") : joinsNext ? "first" : "single";
  });
}
