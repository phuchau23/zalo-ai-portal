import type { AppointmentStatus } from "@/lib/appointments";

/**
 * Vạch màu bên trái khối lịch theo trạng thái (token màu). Nhân viên có màu riêng (BE lưu) thì vạch dùng màu đó;
 * trạng thái vẫn đọc được qua nền khối và nhãn chữ.
 */
const accents: Record<AppointmentStatus, string> = {
  booked: "bg-muted-foreground/45",
  confirmed: "bg-primary",
  arrived: "bg-chart-2",
  in_progress: "bg-chart-2",
  done: "bg-success",
  no_show: "bg-destructive/60",
  cancelled: "bg-destructive/60",
};

export function statusAccent(status: string): string {
  return accents[status as AppointmentStatus] ?? "bg-muted-foreground/45";
}
