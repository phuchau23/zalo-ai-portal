"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/components/session/session-provider";
import { DocumentsTab } from "./documents-tab";
import { HistoryTab } from "./history-tab";
import { ImportTab } from "./import-tab";
import { ItemsTab } from "./items-tab";
import { SearchTab } from "./search-tab";
import { StatusBar } from "./status-bar";

export type KnowledgeTab = "items" | "import" | "history" | "documents" | "search";

const labels: Record<KnowledgeTab, string> = {
  items: "Dữ liệu",
  import: "Nhập file",
  history: "Lịch sử nhập",
  documents: "Tài liệu tham khảo",
  search: "Thử tìm kiếm",
};

export function KnowledgePage({ initialTab }: { initialTab: KnowledgeTab }) {
  const router = useRouter();
  const { me } = useSession();
  const canEdit = me.currentTenant?.role === "owner";
  const [tab, setTab] = useState<KnowledgeTab>(initialTab);

  function changeTab(value: string) {
    setTab(value as KnowledgeTab);
    router.replace(`/knowledge?tab=${value}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Kho kiến thức</h1>
        <p className="text-muted-foreground">
          Dữ liệu bot dùng để trả lời khách: bảng giá, dịch vụ, câu hỏi thường gặp, chính sách. Bot chỉ trả lời theo dữ liệu ở đây.
        </p>
      </div>

      <StatusBar />

      <Tabs value={tab} onValueChange={changeTab}>
        <TabsList className="h-auto flex-wrap">
          {(Object.keys(labels) as KnowledgeTab[]).map((key) => (
            <TabsTrigger key={key} value={key}>
              {labels[key]}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="items" className="pt-4">
          <ItemsTab canEdit={canEdit} onImport={() => changeTab("import")} />
        </TabsContent>
        <TabsContent value="import" className="pt-4">
          <ImportTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="history" className="pt-4">
          <HistoryTab />
        </TabsContent>
        <TabsContent value="documents" className="pt-4">
          <DocumentsTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="search" className="pt-4">
          <SearchTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
