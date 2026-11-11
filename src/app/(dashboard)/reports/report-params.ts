import { Bot, CalendarClock, HandCoins, LayoutDashboard, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { presetRange, rangeFromQuery, suggestedGroupBy, type DateRange, type GroupBy } from "@/lib/reports";

/** Tab của trang Báo cáo. Mỗi tab một URL (?tab=...) để gửi link cho người khác xem đúng chỗ. */
export type ReportTab = "overview" | "revenue" | "customers" | "occupancy" | "ai" | "debt";

export const reportTabs: { value: ReportTab; label: string; icon: LucideIcon; money?: boolean }[] = [
  { value: "overview", label: "Tổng quan", icon: LayoutDashboard },
  { value: "revenue", label: "Doanh thu", icon: TrendingUp, money: true },
  { value: "customers", label: "Khách hàng", icon: Users },
  { value: "occupancy", label: "Lấp đầy lịch", icon: CalendarClock },
  { value: "ai", label: "Trợ lý AI", icon: Bot },
  { value: "debt", label: "Công nợ", icon: HandCoins, money: true },
];

export function isReportTab(value: string | null): value is ReportTab {
  return reportTabs.some((t) => t.value === value);
}

export type ReportParams = { tab: ReportTab; range: DateRange; branchId: string | null; groupBy: GroupBy };

/** Đọc tham số từ URL; thiếu/sai → mặc định 30 ngày qua, tab Tổng quan, mọi chi nhánh, gộp theo độ dài khoảng. */
export function readParams(search: URLSearchParams, now: number): ReportParams {
  const tab = search.get("tab");
  const range = rangeFromQuery(search.get("from"), search.get("to"), presetRange("30d", now));
  const group = search.get("group");
  return {
    tab: isReportTab(tab) ? tab : "overview",
    range,
    branchId: search.get("branch") || null,
    groupBy: group === "day" || group === "week" || group === "month" ? group : suggestedGroupBy(range),
  };
}

/** Chuỗi truy vấn cho một bộ tham số (bỏ cách gộp nếu trùng mặc định cho gọn link). */
export function toQuery(p: ReportParams): string {
  const q = new URLSearchParams({ tab: p.tab, from: p.range.from, to: p.range.to });
  if (p.branchId) q.set("branch", p.branchId);
  if (p.groupBy !== suggestedGroupBy(p.range)) q.set("group", p.groupBy);
  return q.toString();
}

/** Báo cáo mà "Hỏi số liệu" chọn → tab tương ứng (null: mở trang khác, ví dụ hiệu suất nhân viên). */
export function tabForAnswer(report: string | null): ReportTab | "staff" | null {
  switch (report) {
    case "revenue":
      return "revenue";
    case "customers":
      return "customers";
    case "occupancy":
      return "occupancy";
    case "ai":
      return "ai";
    case "outstanding":
      return "debt";
    case "today":
      return "overview";
    case "staff":
      return "staff";
    default:
      return null;
  }
}
