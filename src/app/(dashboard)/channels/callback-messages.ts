/** Thông báo sau khi Zalo chuyển hướng về trang Kênh (?connected=zalo hoặc ?error=<mã>). Mã do BE đặt, không chứa dữ liệu nhạy cảm. */

export type CallbackNotice = { tone: "success" | "error"; title: string; description: string };

const errors: Record<string, string> = {
  expired: "Liên kết kết nối đã hết hạn (sau 10 phút) hoặc đã được dùng. Bấm \"Kết nối Zalo OA\" để thử lại.",
  oa_in_use: "OA này đang kết nối với một doanh nghiệp khác trên hệ thống. Ngắt kết nối ở đó trước rồi thử lại.",
  invalid_callback: "Zalo trả về thiếu thông tin. Vui lòng thử kết nối lại.",
  zalo_unavailable: "Không liên lạc được với Zalo. Vui lòng thử lại sau ít phút.",
};

export function callbackNotice(params: { connected?: string | null; error?: string | null }): CallbackNotice | null {
  if (params.connected === "zalo") {
    return {
      tone: "success",
      title: "Đã kết nối Zalo OA",
      description: "Từ giờ bot sẽ tự trả lời tin nhắn khách gửi vào OA này.",
    };
  }

  if (!params.error) return null;
  const known = errors[params.error];
  if (known) return { tone: "error", title: "Chưa kết nối được", description: known };

  const zaloCode = /^zalo_(-?\d+)$/.exec(params.error)?.[1];
  return {
    tone: "error",
    title: "Chưa kết nối được",
    description: zaloCode
      ? `Zalo báo lỗi (mã ${zaloCode}). Kiểm tra bạn là quản trị viên của OA và OA đã được xác thực, rồi thử lại.`
      : "Có lỗi xảy ra khi kết nối. Vui lòng thử lại.",
  };
}

/**
 * Zalo chặn gửi tin ở cấp OA (chưa mua gói / chưa xác thực): kết nối vẫn "đang hoạt động" (kết nối lại không giúp được),
 * tin khách vẫn vào và được chuyển nhân viên. BE tự xóa mã này khi gửi được tin trở lại.
 */
export function isSendBlocked(code: string | null | undefined): boolean {
  return code === "zalo:-224" || code === "zalo:-221";
}

/** Ý nghĩa mã lỗi gần nhất của kết nối (hiện cạnh trạng thái "Cần kết nối lại" hoặc "Chưa gửi được tin"). */
export function connectionErrorLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "zalo:-216":
    case "zalo:-220":
      return "Mã truy cập của OA không còn hiệu lực.";
    case "zalo:-223":
      return "OA đã thu hồi quyền của ứng dụng.";
    case "zalo:-219":
    case "zalo:-209":
      return "Ứng dụng Zalo đang bị tắt hoặc gỡ bỏ.";
    case "zalo:-224":
      return "OA chưa mua gói Zalo có tính năng gửi tin qua hệ thống, nên bot chưa trả lời được khách. Vào oa.zalo.me để nâng cấp gói OA.";
    case "zalo:-221":
      return "OA chưa được Zalo xác thực, nên bot chưa trả lời được khách. Vào oa.zalo.me để xác thực OA.";
    default:
      return `Zalo báo lỗi ${code.replace("zalo:", "")}.`;
  }
}
