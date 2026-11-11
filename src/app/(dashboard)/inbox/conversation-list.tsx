"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bot, Inbox, MessagesSquare, Search, SearchX, Siren, UserRound, X } from "lucide-react";
import { FilterPills } from "@/components/common/filter-pills";
import { IconTile } from "@/components/common/icon-tile";
import { PersonAvatar } from "@/components/common/person-avatar";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Input } from "@/components/ui/input";
import type { InboxItem } from "@/lib/api/client";
import type { ApiProblem } from "@/lib/api/problem";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { handoffReasonLabel } from "../chat-test/labels";
import { elapsed, filters, matchesSearch, priorityOf, type InboxFilter, type Priority } from "./inbox-utils";

/**
 * Cột trái của Hộp thư: tiêu đề + số khách đang chờ, ô tìm (lọc ngay trên danh sách đã tải), nút lọc, danh sách hội thoại.
 * Hội thoại đổi thứ tự (tin mới) thì trượt tới chỗ mới; hội thoại đang mở có nền trượt theo.
 */
export function ConversationList({
  items,
  loading,
  problem,
  filter,
  attentionCount,
  selectedId,
  now,
  onFilter,
  onSelect,
  onRetry,
  className,
}: {
  items: InboxItem[] | undefined;
  loading: boolean;
  problem: ApiProblem | undefined;
  filter: InboxFilter;
  attentionCount: number;
  selectedId: string | null;
  now: number;
  onFilter: (filter: InboxFilter) => void;
  onSelect: (id: string) => void;
  onRetry: () => void;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const visible = (items ?? []).filter((item) => matchesSearch(item, query));

  return (
    <section aria-label="Danh sách hội thoại" className={cn("flex min-h-0 flex-col bg-card", className)}>
      <div className="flex flex-col gap-3 border-b px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <IconTile icon={MessagesSquare} variant="solid" size="md" />
          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="text-lg leading-tight font-bold tracking-tight">Hộp thư</h1>
            <p className={cn("truncate text-xs", attentionCount > 0 ? "font-medium text-warning" : "text-muted-foreground")}>
              {attentionCount > 0 ? `${attentionCount} khách đang chờ bạn trả lời` : "Bot đang lo hết, chưa ai cần bạn"}
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success" title="Tin mới tự hiện, không cần tải lại trang">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping-soft rounded-full bg-success motion-reduce:hidden" />
              <span className="relative size-2 rounded-full bg-success" />
            </span>
            Trực tiếp
          </span>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <label htmlFor="inbox-search" className="sr-only">
            Tìm hội thoại
          </label>
          <Input
            id="inbox-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm tên khách hoặc nội dung tin"
            className="h-10 rounded-xl border-transparent bg-muted/70 pr-9 pl-9 shadow-none focus-visible:bg-background [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Xóa ô tìm"
              className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>

        <FilterPills
          label="Lọc hội thoại"
          variant="soft"
          value={filter}
          onChange={onFilter}
          options={filters.map((f) => ({ value: f.value, label: f.label, ...(f.value === "attention" ? { count: attentionCount, alert: true } : {}) }))}
        />
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
        {problem && !items && (
          <div className="p-3">
            <ErrorState problem={problem} onRetry={onRetry} />
          </div>
        )}
        {loading && !items && (
          <div role="status" aria-label="Đang tải hội thoại" className="flex flex-col gap-1 p-2">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl p-2.5">
                <div className="skeleton size-11 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="skeleton h-3 w-2/5" />
                  <div className="skeleton h-3 w-4/5 opacity-70" />
                </div>
              </div>
            ))}
          </div>
        )}
        {items && visible.length === 0 && (
          query ? (
            <EmptyState icon={SearchX} title="Không tìm thấy hội thoại" description={`Không có khách hoặc tin nào khớp "${query.trim()}" trong mục đang lọc.`} compact />
          ) : (
            <EmptyState
              icon={Inbox}
              compact
              title={filter === "attention" ? "Không có khách nào đang chờ" : "Chưa có hội thoại"}
              description={
                filter === "attention"
                  ? "Bot đang tự trả lời. Khách cần người sẽ hiện ở đây kèm thông báo."
                  : "Khi khách nhắn vào Zalo OA (hoặc bạn chat thử), hội thoại sẽ hiện ở đây."
              }
            />
          )
        )}
        <ul className="flex flex-col gap-0.5 p-2">
          <AnimatePresence initial={false}>
            {visible.map((item) => (
              <motion.li
                key={item.id}
                layout="position"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={spring}
              >
                <ConversationRow item={item} now={now} selected={item.id === selectedId} onSelect={() => onSelect(item.id)} />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </section>
  );
}

/** Chấm nhỏ trên ảnh đại diện: ai đang trả lời khách (bot / nhân viên) hoặc khẩn cấp. */
export function ModeBadge({ priority, mode, size = "sm" }: { priority: Priority; mode: string; size?: "sm" | "md" }) {
  const urgent = priority === "urgent";
  const Icon = urgent ? Siren : mode === "bot" ? Bot : UserRound;
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full text-white ring-2 ring-card",
        size === "sm" ? "size-[18px] [&_svg]:size-2.5" : "size-5 [&_svg]:size-3",
        urgent ? "bg-destructive" : mode === "bot" ? "bg-ai" : "bg-primary",
      )}
    >
      <Icon />
    </span>
  );
}

const senderPrefix: Record<string, string> = { staff: "Bạn: ", bot: "Bot: " };

function ConversationRow({ item, now, selected, onSelect }: { item: InboxItem; now: number; selected: boolean; onSelect: () => void }) {
  const priority = priorityOf(item);
  const waiting = item.needsAttentionSince ? elapsed(item.needsAttentionSince, now) : null;
  const needsYou = priority === "urgent" || priority === "attention";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "group relative flex w-full cursor-pointer items-start gap-3 rounded-xl p-2.5 text-left transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        !selected && "hover:bg-muted/70",
      )}
    >
      {selected && (
        <motion.span aria-hidden layoutId="inbox-selected" className="absolute inset-0 rounded-xl bg-accent ring-1 ring-primary/15 ring-inset" transition={spring} />
      )}
      <PersonAvatar name={item.contactName} size="md" className="relative mt-0.5" badge={<ModeBadge priority={priority} mode={item.mode} />} />
      <span className="relative flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className={cn("truncate text-sm", needsYou ? "font-bold" : "font-semibold")}>{item.contactName}</span>
          <span className="sr-only">{item.mode === "bot" ? ", bot đang trả lời" : ", nhân viên đang xử lý"}</span>
          {item.isTest && <span className="shrink-0 rounded-md bg-muted px-1.5 py-px text-[10px] font-semibold text-muted-foreground uppercase">Thử</span>}
          <span className={cn("tabular ml-auto shrink-0 text-[11px]", needsYou ? "font-semibold text-warning" : "text-muted-foreground")}>
            {elapsed(item.lastMessageAt, now)}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className={cn("line-clamp-1 flex-1 text-[13px]", needsYou ? "text-foreground/85" : "text-muted-foreground")}>
            {item.lastSender ? senderPrefix[item.lastSender] ?? "" : ""}
            {item.lastMessagePreview ?? "…"}
          </span>
          {needsYou && <span className={cn("size-2.5 shrink-0 rounded-full", priority === "urgent" ? "bg-destructive" : "bg-warning")} aria-hidden />}
        </span>
        {needsYou && (
          <span className="mt-1 flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                priority === "urgent" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning",
              )}
            >
              {priority === "urgent" ? <Siren className="size-3" aria-hidden /> : null}
              {priority === "urgent" ? "Khẩn cấp" : "Cần bạn"}
              {waiting && ` · chờ ${waiting}`}
            </span>
            {item.handoffReason && <span className="truncate text-[11px] text-muted-foreground">{handoffReasonLabel(item.handoffReason)}</span>}
          </span>
        )}
      </span>
    </button>
  );
}
