import type { Metadata } from "next";
import { PageHeader } from "@/components/common/page-header";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Tài khoản — Trợ lý Zalo AI" };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Tài khoản của bạn" description="Đổi mật khẩu đăng nhập. Đổi xong, các máy khác đang đăng nhập tài khoản này sẽ bị đăng xuất." />
      <ChangePasswordForm />
    </div>
  );
}
