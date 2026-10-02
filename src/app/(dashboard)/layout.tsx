import { SessionProvider } from "@/components/session/session-provider";
import { AppShell } from "@/components/shell/app-shell";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <SessionProvider>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
