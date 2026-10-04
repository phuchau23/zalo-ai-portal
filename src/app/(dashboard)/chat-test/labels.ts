/** Nhãn tiếng Việt cho dữ liệu "vì sao bot trả lời vậy" (mã ổn định từ BE, xem BotEngine). */

export type Tone = "default" | "success" | "warning" | "destructive" | "info" | "secondary";

const handoffReasons: Record<string, string> = {
  customer_request: "Khách muốn gặp nhân viên",
  no_knowledge: "Chưa có dữ liệu để trả lời",
  low_confidence: "Bot không chắc chắn",
  complaint: "Khách phàn nàn",
  negative_sentiment: "Khách không hài lòng",
  medical: "Câu hỏi chuyên môn sức khỏe",
  urgent: "Dấu hiệu khẩn cấp",
  booking: "Khách muốn đặt lịch",
  out_of_scope: "Ngoài lĩnh vực của doanh nghiệp",
  ai_error: "Dịch vụ AI gặp lỗi",
  forbidden_phrase: "Câu trả lời vi phạm câu cấm",
  media: "Khách gửi hình ảnh/tệp bot chưa đọc được",
  staff_takeover: "Nhân viên đã tiếp quản",
  staff_replied_in_oa: "Nhân viên trả lời trong ứng dụng Zalo OA",
  other: "Lý do khác",
};

export function handoffReasonLabel(reason: string | null | undefined): string {
  if (!reason) return "";
  return handoffReasons[reason] ?? reason;
}

export function confidenceLabel(confidence: string): { label: string; tone: Tone } {
  switch (confidence) {
    case "high":
      return { label: "Chắc chắn", tone: "success" };
    case "medium":
      return { label: "Khá chắc", tone: "info" };
    default:
      return { label: "Không chắc", tone: "warning" };
  }
}

export function sentimentLabel(sentiment: string | null | undefined): string {
  switch (sentiment) {
    case "positive":
      return "Vui vẻ";
    case "negative":
      return "Không hài lòng";
    case "neutral":
      return "Bình thường";
    default:
      return "Không rõ";
  }
}

/** Mỗi lớp an toàn đã can thiệp: câu giải thích cho chủ doanh nghiệp + mức độ. */
export function guardLabel(guard: string, forbidden: readonly string[] = []): { label: string; tone: Tone } {
  switch (guard) {
    case "danger_keyword":
      return { label: "Tin của khách có dấu hiệu nguy hiểm: bot chuyển nhân viên khẩn cấp ngay, không hỏi AI.", tone: "destructive" };
    case "ai_urgent":
      return { label: "AI đánh giá đây là tình huống khẩn cấp: bot dùng câu trả lời khẩn cấp có sẵn.", tone: "destructive" };
    case "forbidden_retry":
      return {
        label: `Câu trả lời đầu tiên có cụm từ bị cấm${forbidden.length ? ` (${forbidden.map((f) => `"${f}"`).join(", ")})` : ""}: bot đã yêu cầu AI viết lại.`,
        tone: "warning",
      };
    case "forbidden_blocked":
      return { label: "AI viết lại vẫn có cụm từ bị cấm: không gửi câu đó, chuyển nhân viên.", tone: "destructive" };
    case "price_without_source":
      return { label: "AI nêu giá nhưng không dựa trên dữ liệu: đã chặn để không báo giá sai.", tone: "destructive" };
    case "low_confidence_handoff":
      return { label: "AI không chắc chắn: chuyển nhân viên để tránh trả lời sai.", tone: "warning" };
    case "medical_disclaimer_added":
      return { label: "Câu hỏi về sức khỏe: tự thêm lời khuyên thăm khám trực tiếp.", tone: "info" };
    case "parse_retry":
      return { label: "AI trả sai định dạng một lần: đã tự thử lại.", tone: "secondary" };
    case "invalid_output":
      return { label: "AI trả sai định dạng hai lần: gửi câu dự phòng, chuyển nhân viên.", tone: "warning" };
    case "ai_unavailable":
      return { label: "Dịch vụ AI lỗi hoặc quá tải: gửi câu dự phòng, chuyển nhân viên.", tone: "warning" };
    case "search_unavailable":
      return { label: "Không tra cứu được kho kiến thức lúc này: bot trả lời mà không có dữ liệu.", tone: "warning" };
    case "media_handoff":
      return { label: "Khách gửi ảnh/tệp: bot chưa xem được nên trả lời mẫu và chuyển nhân viên.", tone: "info" };
    case "sticker_reply":
      return { label: "Khách gửi sticker: bot đáp ngắn, không gọi AI.", tone: "secondary" };
    case "negative_sentiment_handoff":
      return { label: "Khách có vẻ không hài lòng: chuyển nhân viên.", tone: "warning" };
    case "empty_reply":
      return { label: "AI không trả nội dung: chuyển nhân viên.", tone: "warning" };
    default:
      return { label: guard, tone: "secondary" };
  }
}

const leadLabels: Record<string, string> = {
  name: "Tên",
  phone: "Số điện thoại",
  service_interest: "Dịch vụ quan tâm",
  concern_area: "Vùng cơ thể / mong muốn",
  visited_before: "Đã từng đến chưa",
  preferred_time: "Thời gian muốn đến",
  branch: "Chi nhánh",
  need: "Nhu cầu",
};

export function leadFieldLabel(key: string): string {
  return leadLabels[key] ?? key;
}

/** Chi phí AI: số tiền nhỏ (vài phần nghìn USD) → hiện đủ chữ số có nghĩa, kèm ước tính VND. */
export function formatUsd(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export function formatVnd(usd: number, rate = 26_000): string {
  const vnd = Math.round(usd * rate);
  return `${vnd.toLocaleString("vi-VN")}đ`;
}

export const toneOptions = [
  { value: "friendly", label: "Thân thiện", description: "Ấm áp, gần gũi, có thể dùng biểu tượng cảm xúc nhẹ." },
  { value: "professional", label: "Chuyên nghiệp", description: "Chuẩn mực, lịch sự, hạn chế biểu tượng cảm xúc." },
  { value: "concise", label: "Ngắn gọn", description: "Đi thẳng vào ý chính, tối đa khoảng 3 câu." },
] as const;
