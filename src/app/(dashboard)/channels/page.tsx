import type { Metadata } from "next";
import { Plug } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { ChannelsPage } from "./channels-page";

export const metadata: Metadata = { title: "Kênh Zalo — Trợ lý Zalo AI" };

export default async function Page({ searchParams }: PageProps<"/channels">) {
  const { connected, error } = await searchParams;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        icon={Plug}
        tone="ai"
        title="Kênh Zalo"
        description="Kết nối Zalo Official Account của doanh nghiệp để bot trả lời khách thật 24/7."
        help={
          <ol>
            <li>
              Bấm <strong>Kết nối Zalo OA</strong>, đăng nhập Zalo bằng tài khoản quản trị OA và đồng ý cấp quyền. Hệ thống không bao giờ hỏi mật khẩu Zalo.
            </li>
            <li>Trạng thái &quot;Đang hoạt động&quot; là bot đã bắt đầu trả lời khách nhắn vào OA.</li>
            <li>
              Muốn dừng bot: <strong>Ngắt kết nối</strong>. Tin khách vẫn hiện trong Hộp thư để nhân viên trả lời.
            </li>
          </ol>
        }
      />
      <ChannelsPage connected={typeof connected === "string" ? connected : undefined} error={typeof error === "string" ? error : undefined} />
    </div>
  );
}
