import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return <SettingsNav>{children}</SettingsNav>;
}
