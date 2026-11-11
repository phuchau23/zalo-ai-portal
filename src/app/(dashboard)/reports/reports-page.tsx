"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { BarChart3, Building2, Lock, Store } from "lucide-react";
import { LinkTabs } from "@/components/common/link-tabs";
import { PageHeader } from "@/components/common/page-header";
import { PeriodPicker } from "@/components/common/period-picker";
import { EmptyState } from "@/components/common/states";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { hasPermission } from "@/lib/crm";
import { fadeUp } from "@/lib/motion";
import { suggestedGroupBy } from "@/lib/reports";
import { useApiData } from "@/lib/use-api-data";
import { AiTab } from "./ai-tab";
import { AskBar } from "./ask-bar";
import { CustomersTab } from "./customers-tab";
import { DebtTab } from "./debt-tab";
import { OccupancyTab } from "./occupancy-tab";
import { OverviewTab } from "./overview-tab";
import { readParams, reportTabs, toQuery, type ReportParams, type ReportTab } from "./report-params";
import { RevenueTab } from "./revenue-tab";

const ALL = "__all__";

export type ReportTabProps = {
  params: ReportParams;
  now: number;
  canMoney: boolean;
  canExport: boolean;
  /** Đổi cách gộp ngày/tuần/tháng (giữ trên URL). */
  onGroupBy: (groupBy: ReportParams["groupBy"]) => void;
  /** Chuyển sang tab khác (giữ khoảng ngày). */
  hrefFor: (tab: ReportTab) => string;
};

/**
 * Báo cáo (C6): một chỗ xem doanh thu, khách, lấp đầy lịch, hiệu quả trợ lý AI, công nợ — chung một khoảng thời gian và chi nhánh
 * chọn ở đầu trang, lưu trên URL (?tab=&from=&to=&branch=) để gửi link là người nhận thấy đúng báo cáo đó.
 * Quyền: "Xem báo cáo" để vào trang; tab có tiền (Doanh thu, Công nợ) cần thêm "Xem doanh thu toàn công ty".
 */
export function ReportsPage() {
  const { me } = useSession();
  const tenant = me.currentTenant;
  const canView = hasPermission(tenant, "view_reports");
  const canMoney = hasPermission(tenant, "view_company_revenue");
  const canExport = hasPermission(tenant, "export_data");
  const search = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const params = readParams(new URLSearchParams(search.toString()), now);
  const branches = useApiData(() => (canView ? call(() => api.GET("/branches", { params: { query: { includeInactive: false } } })) : Promise.resolve({ ok: true as const, data: [] })));

  const tabs = reportTabs.filter((t) => !t.money || canMoney);
  const tab: ReportTab = tabs.some((t) => t.value === params.tab) ? params.tab : "overview";
  const current = { ...params, tab };

  function go(patch: Partial<ReportParams>) {
    const next = { ...current, ...patch };
    if (patch.range && !patch.groupBy) next.groupBy = suggestedGroupBy(patch.range);
    router.replace(`${pathname}?${toQuery(next)}`, { scroll: false });
  }
  const hrefFor = (t: ReportTab) => `/reports?${toQuery({ ...current, tab: t })}`;

  const header = (
    <PageHeader
      icon={BarChart3}
      title="Báo cáo"
      description="Doanh thu, khách, lịch hẹn và kết quả của trợ lý AI. Số do hệ thống tính từ hóa đơn và lịch hẹn, không phải AI ước đoán."
      help={
        <ul>
          <li>
            Chọn <strong>khoảng thời gian</strong> (và chi nhánh nếu có nhiều) ở góc phải — mọi tab dùng chung khoảng này.
          </li>
          <li>
            Gõ câu hỏi vào ô <strong>Hỏi số liệu</strong>, ví dụ “doanh thu tháng này theo nhân viên”: hệ thống mở đúng báo cáo và tóm tắt bằng lời.
          </li>
          <li>Rê chuột (hoặc chạm) vào biểu đồ để xem số chính xác từng ngày. Gửi link trang này cho người khác là họ thấy đúng báo cáo bạn đang xem.</li>
        </ul>
      }
      actions={
        canView && (
          <>
            {(branches.data?.length ?? 0) > 1 && (
              <Select value={current.branchId ?? ALL} onValueChange={(v) => go({ branchId: v === ALL ? null : v })}>
                <SelectTrigger className="h-11 w-full min-w-44 rounded-xl bg-card shadow-card sm:h-10 sm:w-auto" aria-label="Chi nhánh">
                  <Store className="text-primary" aria-hidden />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Mọi chi nhánh</SelectItem>
                  {branches.data!.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <PeriodPicker value={current.range} onChange={(range) => go({ range })} now={now} className="w-full sm:w-auto" />
          </>
        )
      }
    />
  );

  if (!tenant) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState icon={Building2} title="Chưa chọn doanh nghiệp" description="Báo cáo là số liệu của một doanh nghiệp. Chọn doanh nghiệp ở thanh bên để xem." />
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <EmptyState
          icon={Lock}
          title="Bạn chưa có quyền xem báo cáo"
          description="Nhờ chủ doanh nghiệp bật quyền “Xem báo cáo” cho tài khoản của bạn ở Cài đặt → Tài khoản & phân quyền."
        />
      </div>
    );
  }

  const props: ReportTabProps = { params: current, now, canMoney, canExport, onGroupBy: (groupBy) => go({ groupBy }), hrefFor };

  return (
    <div className="flex flex-col gap-6">
      {header}
      <AskBar
        onOpen={(target, range) => {
          if (target === "staff") router.push(`/staff/performance${range ? `?from=${range.from}&to=${range.to}` : ""}`);
          else go({ tab: target, ...(range ? { range } : {}) });
        }}
      />
      <div className="flex flex-col gap-5">
        <LinkTabs label="Các báo cáo" tabs={tabs.map((t) => ({ href: hrefFor(t.value), label: t.label, icon: t.icon, active: t.value === tab }))} />
        <motion.div key={tab} variants={fadeUp} initial="hidden" animate="show">
          {tab === "overview" && <OverviewTab {...props} />}
          {tab === "revenue" && <RevenueTab {...props} />}
          {tab === "customers" && <CustomersTab {...props} />}
          {tab === "occupancy" && <OccupancyTab {...props} />}
          {tab === "ai" && <AiTab {...props} />}
          {tab === "debt" && <DebtTab {...props} />}
        </motion.div>
      </div>
    </div>
  );
}
