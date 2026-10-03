"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileStack, FileUp, History, Search, Table2, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/components/session/session-provider";
import { DocumentsTab } from "./documents-tab";
import { DownloadButtons } from "./download-buttons";
import { HistoryTab } from "./history-tab";
import { ImportTab } from "./import-tab";
import { ItemsTab } from "./items-tab";
import { SearchTab } from "./search-tab";
import { StatusBar } from "./status-bar";

export type KnowledgeTab = "items" | "import" | "history" | "documents" | "search";

const tabs: Record<KnowledgeTab, { label: string; icon: LucideIcon }> = {
  items: { label: "Dữ liệu", icon: Table2 },
  import: { label: "Nhập file", icon: FileUp },
  history: { label: "Lịch sử nhập", icon: History },
  documents: { label: "Tài liệu tham khảo", icon: FileStack },
  search: { label: "Thử tìm kiếm", icon: Search },
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
      <PageHeader
        title="Kho kiến thức"
        description="Dữ liệu bot dùng để trả lời khách: bảng giá, dịch vụ, câu hỏi thường gặp, chính sách. Bot chỉ trả lời theo dữ liệu ở đây."
        actions={
          <>
            <DownloadButtons showTemplate={false} />
            {canEdit && tab !== "import" && (
              <Button onClick={() => changeTab("import")}>
                <FileUp aria-hidden />
                Nhập file
              </Button>
            )}
          </>
        }
      />

      <StatusBar />

      <Tabs value={tab} onValueChange={changeTab} className="gap-0">
        <div className="overflow-x-auto border-b">
          <TabsList variant="line" className="group-data-horizontal/tabs:h-10">
            {(Object.keys(tabs) as KnowledgeTab[]).map((key) => {
              const Icon = tabs[key].icon;
              return (
                <TabsTrigger key={key} value={key}>
                  <Icon aria-hidden />
                  {tabs[key].label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>
        <TabsContent value="items" className="pt-5">
          <ItemsTab canEdit={canEdit} onImport={() => changeTab("import")} />
        </TabsContent>
        <TabsContent value="import" className="pt-5">
          <ImportTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="history" className="pt-5">
          <HistoryTab />
        </TabsContent>
        <TabsContent value="documents" className="pt-5">
          <DocumentsTab canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="search" className="pt-5">
          <SearchTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
