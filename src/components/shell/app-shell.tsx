"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Building2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/common/states";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { ExpiryBanner, UsageBanner } from "./banners";
import { MobileTabBar, MobileTopBar } from "./mobile-nav";
import { buildNav } from "./nav-config";
import { Sidebar } from "./sidebar";
import { useNavCounts } from "./use-nav-counts";

/**
 * Khung trang quản trị. Máy tính: thanh bên chia nhóm (nav-config.ts). Điện thoại: thanh trên + thanh dưới 4 mục + "Thêm".
 * Nội dung nằm trên nền canvas (xám-xanh rất nhạt) để các thẻ trắng nổi lên.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { me, reload } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const counts = useNavCounts(me.currentTenant?.id);
  const { groups, settings } = buildNav(me);

  // Trang /admin (super admin) và /account (đổi mật khẩu) không cần doanh nghiệp đang hoạt động.
  const adminArea = (me.isSuperAdmin && pathname.startsWith("/admin")) || pathname.startsWith("/account");

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

  return (
    <div className="flex min-h-svh flex-1 bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-card"
      >
        Bỏ qua menu, tới nội dung
      </a>
      <Sidebar {...navProps} />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar me={me} />
        <main id="main" className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          <div className="mx-auto flex w-full max-w-7xl flex-col px-4 py-5 sm:px-6 md:px-8 md:py-8">
            {adminArea ? (
              children
            ) : me.currentTenant ? (
              <>
                {me.currentTenant.role === "owner" && (
                  <>
                    <ExpiryBanner expiresAt={me.currentTenant.expiresAt} />
                    <UsageBanner tenantId={me.currentTenant.id} />
                  </>
                )}
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
  );
}
