import {
  BookOpenText,
  Boxes,
  CalendarDays,
  HeartHandshake,
  Inbox,
  LayoutDashboard,
  ListChecks,
  MessageSquareText,
  Package,
  Plug,
  ReceiptText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserRoundCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Me } from "@/lib/api/client";
import { hasPermission } from "@/lib/crm";

/**
 * Sơ đồ menu của trang quản trị, chia theo việc người dùng làm trong ngày:
 * Vận hành (việc tại quầy) → Khách hàng → Trợ lý AI (dạy và chỉnh bot) → Quản lý (dữ liệu nền) → Cài đặt.
 * Mọi màn hình nằm đúng một chỗ; trang con (ví dụ /settings/team) sáng mục cha.
 */
export type NavBadge = "inbox" | "care";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Một câu giải thích mục này để làm gì: hiện ở menu "Thêm" trên điện thoại và làm tooltip. */
  description: string;
  /** Chỉ hiện khi doanh nghiệp hiện tại có quyền này (chủ doanh nghiệp luôn có). */
  permission?: string;
  /** Chỉ chủ doanh nghiệp (nhân viên vào thẳng Hộp thư). */
  ownerOnly?: boolean;
  badge?: NavBadge;
  /** Trang của BE (qua rewrite), không phải trang Next.js → dùng thẻ <a>. */
  external?: boolean;
};

export type NavGroup = { id: string; label: string | null; ai?: boolean; items: NavItem[] };

const tenantGroups: NavGroup[] = [
  {
    id: "home",
    label: null,
    items: [
      {
        href: "/",
        label: "Tổng quan",
        icon: LayoutDashboard,
        description: "Việc hôm nay, doanh thu, kết quả của trợ lý AI.",
        ownerOnly: true,
      },
    ],
  },
  {
    id: "operations",
    label: "Vận hành",
    items: [
      { href: "/appointments", label: "Lịch hẹn", icon: CalendarDays, description: "Lịch của từng nhân viên, đặt lịch, check-in." },
      { href: "/inbox", label: "Hộp thư", icon: Inbox, description: "Tin nhắn Zalo của khách, tiếp quản khi cần người.", badge: "inbox" },
      { href: "/sales", label: "Bán hàng", icon: ReceiptText, description: "Hóa đơn, thu tiền, ca thu ngân, voucher." },
    ],
  },
  {
    id: "customers",
    label: "Khách hàng",
    items: [
      { href: "/customers", label: "Khách hàng", icon: Users, description: "Hồ sơ khách, mức tiềm năng, gói đang dùng." },
      { href: "/care", label: "Cần chăm sóc", icon: HeartHandshake, description: "Khách nên liên hệ: bot đã nhắn hoặc cần người.", badge: "care" },
    ],
  },
  {
    id: "ai",
    label: "Trợ lý AI",
    ai: true,
    items: [
      { href: "/chat-test", label: "Chat thử", icon: MessageSquareText, description: "Đóng vai khách để thử câu trả lời của bot." },
      { href: "/knowledge", label: "Kho kiến thức", icon: BookOpenText, description: "Dữ liệu bot dùng để trả lời: dịch vụ, giá, câu hỏi." },
      { href: "/assistant", label: "Thiết lập trợ lý", icon: SlidersHorizontal, description: "Giọng văn, chuyển nhân viên, chăm sóc chủ động." },
      { href: "/channels", label: "Kênh Zalo", icon: Plug, description: "Kết nối Zalo Official Account để bot trả lời khách." },
    ],
  },
  {
    id: "manage",
    label: "Quản lý",
    items: [
      { href: "/catalog", label: "Danh mục", icon: Package, description: "Dịch vụ, gói liệu trình, sản phẩm và giá bán." },
      { href: "/inventory", label: "Kho hàng", icon: Boxes, description: "Tồn kho, nhập hàng, kiểm kê, vật tư." },
      { href: "/staff", label: "Nhân viên", icon: UserRoundCog, description: "Hồ sơ nhân viên, dịch vụ làm được, ca làm." },
    ],
  },
];

export const settingsItem: NavItem = {
  href: "/settings",
  label: "Cài đặt",
  icon: Settings,
  description: "Doanh nghiệp, chi nhánh, tài khoản, thanh toán, thông báo.",
};

const adminGroup: NavGroup = {
  id: "system",
  label: "Hệ thống",
  items: [
    { href: "/admin", label: "Doanh nghiệp thuê", icon: ShieldCheck, description: "Gói, hạn thuê, hạn mức, chi phí AI của từng doanh nghiệp." },
    { href: "/hangfire", label: "Hàng đợi job", icon: ListChecks, description: "Theo dõi job chạy nền.", external: true },
  ],
};

type Tenant = Me["currentTenant"];

function visible(item: NavItem, tenant: Tenant): boolean {
  if (item.ownerOnly && tenant?.role !== "owner") return false;
  return !item.permission || hasPermission(tenant, item.permission);
}

/** Menu theo người đang đăng nhập: chưa có doanh nghiệp thì chỉ còn phần hệ thống (super admin). */
export function buildNav(me: Me): { groups: NavGroup[]; settings: NavItem | null } {
  const tenant = me.currentTenant;
  const groups = tenant
    ? tenantGroups.map((g) => ({ ...g, items: g.items.filter((i) => visible(i, tenant)) })).filter((g) => g.items.length > 0)
    : [];
  if (me.isSuperAdmin) groups.push(adminGroup);
  return { groups, settings: tenant ? settingsItem : null };
}

/** Mục trên thanh dưới cùng (điện thoại): tối đa 4 mục hay dùng nhất + nút "Thêm". */
export function mobilePrimary(groups: NavGroup[]): NavItem[] {
  const all = groups.flatMap((g) => g.items);
  const preferred = ["/", "/appointments", "/inbox", "/customers", "/care", "/admin"];
  return preferred.map((href) => all.find((i) => i.href === href)).filter((i): i is NavItem => Boolean(i)).slice(0, 4);
}

/** Đang ở mục này (kể cả trang con). "/" chỉ khớp đúng trang chủ. */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
