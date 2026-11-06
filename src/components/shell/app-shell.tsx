"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { Building2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/common/states";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { ExpiryBanner, UsageBanner } from "./banners";
import { MobileTabBar, MobileTopBar } from "./mobile-nav";
import { buildNav } from "./nav-config";
import { Sidebar } from "./sidebar";
import { useNavCounts } from "./use-nav-counts";

const collapsedKey = "sidebar:collapsed";

/** Trang chiếm trọn tấm nội dung, không lề, không giới hạn bề rộng (kiểu ứng dụng nhắn tin). */
function isFullBleed(pathname: string) {
  return pathname === "/inbox";
}

/**
 * Khung trang quản trị.
 * Máy tính: khung trắng (thanh bên, thu gọn được) bao quanh một tấm nội dung xám-xanh nhạt bo góc; tấm này tự cuộn, thanh bên đứng yên.
 * Điện thoại: thanh trên + thanh dưới 4 mục + "Thêm"; cả trang cuộn như bình thường.
 * Phần đầu tấm nội dung có lưới chấm và hai quầng sáng mờ (xanh, tím) làm nền cho tiêu đề trang.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { me, reload } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const counts = useNavCounts(me.currentTenant?.id);
  const { groups, settings } = buildNav(me);
  const fullBleed = isFullBleed(pathname);
  const roomy = useMediaQuery("(min-width: 1600px)");
  // Trang kiểu nhắn tin trên màn chưa đủ rộng: tự thu thanh bên thành dải biểu tượng để khung chat rộng hơn
  // (không đổi lựa chọn đã lưu của người dùng; bấm ghim thì mở lại cho tới khi rời trang).
  const autoRail = fullBleed && !roomy && !pinnedOpen;
  const sidebarCollapsed = collapsed || autoRail;

  // Trang /admin (super admin) và /account (đổi mật khẩu) không cần doanh nghiệp đang hoạt động.
  const adminArea = (me.isSuperAdmin && pathname.startsWith("/admin")) || pathname.startsWith("/account");

  useEffect(() => {
    try {
      // Đọc sau khi gắn lên trình duyệt (máy chủ không có localStorage), tránh lệch nội dung khi hydrate.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (window.localStorage.getItem(collapsedKey) === "1") setCollapsed(true);
    } catch {
      // Trình duyệt chặn localStorage: mặc định mở rộng.
    }
  }, []);

  const persistCollapsed = useCallback((next: boolean) => {
    setCollapsed(next);
    try {
      window.localStorage.setItem(collapsedKey, next ? "1" : "0");
    } catch {
      // Không lưu được thì lần sau mặc định mở rộng.
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    if (collapsed) persistCollapsed(false);
    else if (autoRail) setPinnedOpen(true);
    else {
      setPinnedOpen(false);
      persistCollapsed(true);
    }
  }, [collapsed, autoRail, persistCollapsed]);

  // Rời trang nhắn tin thì bỏ ghim tạm.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đặt lại theo trang đang mở
    if (!fullBleed) setPinnedOpen(false);
  }, [fullBleed]);

  // Ctrl+B / Cmd+B: thu gọn hoặc mở rộng thanh bên.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "b" && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        toggleCollapsed();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleCollapsed]);

  // Tấm nội dung tự cuộn (máy tính) nên Next.js không tự về đầu trang khi chuyển trang.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  async function switchTenant(tenantId: string) {
    setBusy(true);
    const result = await call(() => api.POST("/auth/switch-tenant", { body: { tenantId } }));
    if (result.ok) {
      await reload();
      router.refresh();
    }
    setBusy(false);
  }

  async function logout() {
    setBusy(true);
    await call(() => api.POST("/auth/logout"));
    router.replace("/login");
  }

  const navProps = { me, groups, settings, pathname, counts, busy, onSwitchTenant: (id: string) => void switchTenant(id), onLogout: () => void logout() };
  const banners = me.currentTenant?.role === "owner" && (
    <>
      <ExpiryBanner expiresAt={me.currentTenant.expiresAt} />
      <UsageBanner tenantId={me.currentTenant.id} />
    </>
  );

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={250}>
        {/* Máy tính: khung cao đúng bằng màn hình (flex-none để chiều cao không bị flex-1 của body nới theo nội dung). */}
        <div className="flex min-h-svh flex-1 bg-canvas md:h-svh md:flex-none md:overflow-hidden md:bg-shell-gradient">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-card"
          >
            Bỏ qua menu, tới nội dung
          </a>
          <Sidebar {...navProps} collapsed={sidebarCollapsed} onToggleCollapsed={toggleCollapsed} />

          <div className="flex min-w-0 flex-1 flex-col md:py-2 md:pr-2">
            <MobileTopBar me={me} />
            <main
              id="main"
              ref={mainRef}
              className="scrollbar-thin relative isolate flex min-w-0 flex-1 flex-col bg-canvas pb-[calc(5rem+env(safe-area-inset-bottom))] md:overflow-y-auto md:rounded-[22px] md:pb-0 md:shadow-panel"
            >
              {!fullBleed && <PanelAura />}
              <div
                className={cn(
                  "relative mx-auto flex w-full flex-1 flex-col",
                  fullBleed ? "min-h-0" : "px-4 py-5 sm:px-6 md:px-8 md:py-8",
                )}
              >
                {adminArea ? (
                  children
                ) : me.currentTenant ? (
                  <>
                    {fullBleed ? <div className="flex shrink-0 flex-col px-3 pt-3 empty:hidden *:mb-0">{banners}</div> : banners}
                    {children}
                  </>
                ) : (
                  <EmptyState
                    icon={Building2}
                    title="Chưa có doanh nghiệp đang hoạt động"
                    description="Tài khoản của bạn chưa thuộc doanh nghiệp nào, hoặc doanh nghiệp đã bị tạm khóa. Liên hệ quản trị viên để được thêm vào doanh nghiệp."
                  >
                    {me.isSuperAdmin && (
                      <Link href="/admin" className={cn(buttonVariants({ variant: "outline" }), "h-11 sm:h-9")}>
                        Mở trang quản trị hệ thống
                      </Link>
                    )}
                  </EmptyState>
                )}
              </div>
            </main>
          </div>

          <MobileTabBar {...navProps} />
        </div>
      </TooltipProvider>
    </MotionConfig>
  );
}

/** Nền trang trí phía sau tiêu đề trang: lưới chấm mờ dần + hai quầng sáng (xanh, tím). Không bắt sự kiện chuột. */
function PanelAura() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 overflow-hidden md:rounded-t-[22px]">
      <div className="absolute inset-0 bg-dot-grid opacity-70 [mask-image:linear-gradient(to_bottom,black_0%,transparent_85%)]" />
      <div className="absolute -top-40 left-[12%] h-72 w-[34rem] rounded-full bg-primary/12 blur-3xl" />
      <div className="absolute -top-32 right-[-6rem] h-64 w-[30rem] rounded-full bg-ai/12 blur-3xl" />
    </div>
  );
}
