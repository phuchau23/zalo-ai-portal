"use client";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSession } from "@/components/session/session-provider";

const upcoming = [
  { title: "Kho kiến thức", description: "Nạp bảng giá, FAQ, tài liệu để bot trả lời đúng dữ liệu của bạn.", module: "M2" },
  { title: "Chat thử", description: "Tự chat với bot và chỉnh giọng văn trước khi bật cho khách.", module: "M3" },
  { title: "Kết nối Zalo OA", description: "Kết nối Official Account để bot trả lời khách 24/7.", module: "M4" },
  { title: "Hộp thư", description: "Xem hội thoại, tiếp quản khi khách cần người thật.", module: "M5" },
];

export default function OverviewPage() {
  const { me } = useSession();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Xin chào, {me.name}</h1>
        <p className="text-muted-foreground">{me.currentTenant?.name}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {upcoming.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>
                {item.description} <span className="whitespace-nowrap">(sắp có — {item.module})</span>
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
