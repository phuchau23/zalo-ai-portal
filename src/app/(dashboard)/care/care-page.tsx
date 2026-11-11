"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Flame, HeartHandshake, Hourglass, UserRound, Users } from "lucide-react";
import { FilterLayout, FilterSection } from "@/components/common/filter-layout";
import { FilterPills, type FilterOption } from "@/components/common/filter-pills";
import { EmptyState, ErrorState } from "@/components/common/states";
import { buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { fadeUp, stagger } from "@/lib/motion";
import { useApiData, useNow } from "@/lib/use-api-data";
import { PhoneDueSection } from "./phone-due-section";
import { SuggestionCard } from "./suggestion-card";

type Filter = "all" | "mine" | "hot" | "expiring";
type Status = "open" | "autosent" | "done" | "skipped" | "expired";

const filters: FilterOption<Filter>[] = [
  { value: "all", label: "Tất cả", icon: Users, tone: "primary" },
  { value: "mine", label: "Của tôi", icon: UserRound, tone: "primary" },
  { value: "hot", label: "Nóng", icon: Flame, tone: "warning" },
  { value: "expiring", label: "Sắp hết hạn nhắn", icon: Hourglass, tone: "destructive" },
];

const statuses: { value: Status; label: string }[] = [
  { value: "open", label: "Cần làm" },
  { value: "autosent", label: "Bot đã nhắn" },
  { value: "done", label: "Đã xử lý" },
  { value: "skipped", label: "Đã bỏ qua" },
  { value: "expired", label: "Hết hạn nhắn" },
];

export function CarePage() {
  const { me } = useSession();
  const isOwner = me.currentTenant?.role === "owner";
  const [filter, setFilter] = useState<Filter>("all");
  const [status, setStatus] = useState<Status>("open");
  const now = useNow();

  const { data, problem, loading, reload } = useApiData(() =>
    call(() => api.GET("/care/suggestions", { params: { query: { status, filter } } })),
  );
  const { data: members } = useApiData(() => call(() => api.GET("/tenant/members")));

  const refresh = reload;

  useEffect(() => {
    refresh();
  }, [filter, status, me.currentTenant?.id, refresh]);

  // Gợi ý mới do AI tạo (sự kiện "care") hoặc khách nhắn lại → tải lại; dự phòng 60 giây một lần.
  useEffect(() => {
    const source = new EventSource("/api/inbox/stream");
    source.onmessage = () => refresh();
    const poll = setInterval(refresh, 60_000);
    return () => {
      source.close();
      clearInterval(poll);
    };
  }, [refresh, me.currentTenant?.id]);

  const items = data ?? [];
  const filtered = filter !== "all" || status !== "open";

  return (
    <FilterLayout
      onReset={
        filtered
          ? () => {
              setFilter("all");
              setStatus("open");
            }
          : undefined
      }
      filters={
        <>
          <FilterSection label="Trạng thái" htmlFor="care-status">
            <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
              <SelectTrigger id="care-status" className="h-11 w-full rounded-xl sm:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterSection>
          <FilterSection label="Khách">
            <FilterPills label="Lọc gợi ý" variant="list" value={filter} onChange={setFilter} options={filters} />
          </FilterSection>
        </>
      }
    >
      <PhoneDueSection />

      {problem && !data && <ErrorState problem={problem} onRetry={refresh} />}
      {loading && !data && (
        <div role="status" aria-label="Đang tải gợi ý" className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="surface flex flex-col gap-4 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <div className="skeleton size-10 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="skeleton h-3.5 w-48" />
                  <div className="skeleton h-3 w-32 opacity-70" />
                </div>
              </div>
              <div className="skeleton h-16 rounded-xl" />
            </div>
          ))}
        </div>
      )}
      {data && items.length === 0 && (
        <EmptyState
          icon={HeartHandshake}
          title={status === "open" ? "Chưa có khách nào cần nhắn" : "Không có gợi ý nào"}
          description={
            status === "open"
              ? "Khi khách im lặng quá vài giờ mà chưa chốt, AI sẽ gợi ý ở đây. Bạn cũng có thể ghi ngày hẹn chăm sóc lại trong hồ sơ khách."
              : "Đổi bộ lọc để xem các gợi ý khác."
          }
        >
          {status === "open" && (
            <Link href="/customers" className={buttonVariants({ variant: "outline" })}>
              Xem danh sách khách
            </Link>
          )}
        </EmptyState>
      )}
      <motion.div key={`${filter}-${status}`} variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-4">
        {items.map((s) => (
          <motion.div key={`${s.id}-${s.updatedAt}`} variants={fadeUp}>
            <SuggestionCard suggestion={s} members={members} isOwner={isOwner} now={now} onChanged={refresh} />
          </motion.div>
        ))}
      </motion.div>
    </FilterLayout>
  );
}
