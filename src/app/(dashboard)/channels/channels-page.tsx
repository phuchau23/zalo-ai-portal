"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  Bot,
  CircleAlert,
  CircleCheck,
  Clock3,
  Hand,
  Info,
  KeyRound,
  LoaderCircle,
  Lock,
  MessageCircleMore,
  Plug,
  RefreshCw,
  ShieldCheck,
  Unplug,
  type LucideIcon,
} from "lucide-react";
import { IconTile, type Tone } from "@/components/common/icon-tile";
import { ErrorState, LoadingRows } from "@/components/common/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api, type ChannelConnection } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { formatDateTime } from "@/lib/format";
import { fadeUp, stagger } from "@/lib/motion";
import { useApiData } from "@/lib/use-api-data";
import { cn } from "@/lib/utils";
import { callbackNotice, connectionErrorLabel, isSendBlocked, type CallbackNotice } from "./callback-messages";

const connectSteps = ["Bấm Kết nối Zalo OA", "Đăng nhập Zalo bằng tài khoản quản trị OA", "Đồng ý cấp quyền — bot bắt đầu trả lời"];

const trust: { icon: LucideIcon; label: string }[] = [
  { icon: ShieldCheck, label: "Kết nối chính thức qua Zalo" },
  { icon: KeyRound, label: "Không bao giờ hỏi mật khẩu" },
  { icon: Clock3, label: "Bot trả lời 24/7" },
];

const tips: { icon: LucideIcon; tone: Tone; text: string }[] = [
  {
    icon: Hand,
    tone: "primary",
    text: "Nhân viên vẫn trả lời được ngay trong ứng dụng Zalo OA. Khi đó bot tự dừng ở cuộc trò chuyện đó để không chen vào.",
  },
  { icon: Bot, tone: "ai", text: "Tin đầu tiên bot gửi cho mỗi khách luôn kèm câu báo đây là trợ lý AI và link chính sách bảo mật trong Cài đặt." },
  { icon: Clock3, tone: "warning", text: "Zalo chỉ cho OA nhắn khách đã tương tác trong 7 ngày; trong 48 giờ sau tin cuối của khách, tin tư vấn được miễn phí." },
];

export function ChannelsPage({ connected, error }: { connected?: string; error?: string }) {
  const { me } = useSession();
  const router = useRouter();
  const canEdit = me.currentTenant?.role === "owner";
  const { data, problem, loading, reload } = useApiData(() => call(() => api.GET("/channels")));
  const [notice] = useState<CallbackNotice | null>(() => callbackNotice({ connected, error }));
  const [actionProblem, setActionProblem] = useState<ApiProblem | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [confirm, setConfirm] = useState<ChannelConnection | null>(null);

  // Xóa ?connected / ?error khỏi thanh địa chỉ (thông báo đã giữ trong state), tránh hiện lại khi tải lại trang.
  useEffect(() => {
    if (connected || error) router.replace("/channels", { scroll: false });
  }, [connected, error, router]);

  async function connect() {
    setConnecting(true);
    setActionProblem(null);
    const result = await call(() => api.POST("/channels/zalo/connect"));
    if (result.ok) {
      // Sang trang cấp quyền của Zalo; Zalo sẽ đưa về lại trang này.
      window.location.assign(result.data.url);
      return;
    }

    setConnecting(false);
    setActionProblem(result.problem);
  }

  async function disconnect(connection: ChannelConnection) {
    setActionProblem(null);
    const result = await call(() => api.DELETE("/channels/{connectionId}", { params: { path: { connectionId: connection.id } } }));
    if (!result.ok) setActionProblem(result.problem);
    reload();
  }

  const connections = data?.connections ?? [];
  const configured = data?.configured ?? true;
  const connectButton = canEdit && configured && (
    <Button variant="zalo" onClick={() => void connect()} disabled={connecting} className="h-11 px-4 sm:h-10">
      {connecting ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Plug aria-hidden />}
      {connecting ? "Đang chuyển sang Zalo..." : connections.length ? "Kết nối thêm OA" : "Kết nối Zalo OA"}
    </Button>
  );

  return (
    <div className="flex flex-col gap-5">
      {notice && (
        <Alert variant={notice.tone === "error" ? "destructive" : "default"} role={notice.tone === "error" ? "alert" : "status"}>
          {notice.tone === "error" ? <CircleAlert aria-hidden /> : <CircleCheck className="text-success" aria-hidden />}
          <AlertTitle>{notice.title}</AlertTitle>
          <AlertDescription>{notice.description}</AlertDescription>
        </Alert>
      )}

      {actionProblem && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{problemMessage(actionProblem)}</AlertDescription>
        </Alert>
      )}

      {!canEdit && (
        <Alert>
          <Lock aria-hidden />
          <AlertDescription>Bạn đang xem với quyền nhân viên. Chỉ chủ doanh nghiệp được kết nối hoặc ngắt kết nối kênh.</AlertDescription>
        </Alert>
      )}

      {data && !configured && (
        <Alert>
          <Info aria-hidden />
          <AlertTitle>Hệ thống chưa sẵn sàng kết nối Zalo</AlertTitle>
          <AlertDescription>Quản trị viên hệ thống chưa cấu hình ứng dụng Zalo. Vui lòng liên hệ để được hỗ trợ.</AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="zalo-title" className="surface relative isolate overflow-hidden rounded-2xl">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 overflow-hidden">
        </div>

        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between md:p-6">
          <div className="flex gap-4">
            <IconTile icon={MessageCircleMore} variant="solid" size="lg" className="bg-zalo text-zalo-foreground" />
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <h2 id="zalo-title" className="text-lg font-bold tracking-tight">
                  Zalo Official Account
                </h2>
                <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
                  Bot trả lời tin nhắn khách gửi vào OA 24/7. Bạn cần là quản trị viên của OA; hệ thống chỉ nhận quyền gửi và đọc tin, không bao giờ hỏi
                  mật khẩu Zalo.
                </p>
              </div>
              <ul className="flex flex-wrap gap-2" aria-label="Cam kết khi kết nối">
                {trust.map(({ icon: Icon, label }) => (
                  <li key={label} className="inline-flex items-center gap-1.5 rounded-full border bg-card/80 px-2.5 py-1 text-xs font-medium text-foreground/80">
                    <Icon className="size-3.5 text-success" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {connections.length > 0 && <div className="shrink-0">{connectButton}</div>}
        </div>

        <div className="flex flex-col gap-3 border-t bg-muted/20 p-4 md:p-5">
          {problem && !data && <ErrorState problem={problem} onRetry={reload} />}
          {loading && !data && !problem && <LoadingRows rows={1} columns={3} />}

          {data && connections.length === 0 && (
            <div className="flex flex-col items-center gap-5 px-2 py-6 text-center">
              <div className="flex flex-col gap-1">
                <p className="text-base font-semibold tracking-tight">Chưa kết nối OA nào</p>
                <p className="max-w-lg text-sm text-pretty text-muted-foreground">
                  Chỉ mất khoảng một phút. Sau khi đồng ý trên Zalo, bạn sẽ được đưa về lại trang này.
                </p>
              </div>
              <motion.ol variants={stagger} initial="hidden" animate="show" className="grid w-full max-w-3xl gap-3 text-left sm:grid-cols-3">
                {connectSteps.map((step, i) => (
                  <motion.li key={step} variants={fadeUp} className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-card">
                    <span
                      className="tabular flex size-8 shrink-0 items-center justify-center rounded-full bg-active-gradient text-sm font-bold text-white"
                      aria-hidden
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm">
                      <span className="sr-only">Bước {i + 1}: </span>
                      {step}
                    </span>
                  </motion.li>
                ))}
              </motion.ol>
              {connectButton || (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Plug className="size-4" aria-hidden />
                  {configured ? "Chủ doanh nghiệp sẽ kết nối OA ở đây." : "Chưa kết nối được: hệ thống chưa cấu hình ứng dụng Zalo."}
                </p>
              )}
            </div>
          )}

          {connections.length > 0 && (
            <ul className="flex flex-col gap-3" aria-label="OA đã kết nối">
              {connections.map((c) => {
                const active = c.status === "active";
                const errorLabel = connectionErrorLabel(c.lastError);
                // Kết nối còn hiệu lực nhưng Zalo chặn gửi (OA chưa mua gói...) → cảnh báo, không bắt kết nối lại.
                const blocked = active && isSendBlocked(c.lastError);
                return (
                  <li
                    key={c.id}
                    className={cn(
                      "flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-card sm:flex-row sm:items-center sm:justify-between",
                      (!active || blocked) && "border-warning/40",
                    )}
                  >
                    <div className="flex min-w-0 items-start gap-3.5">
                      <span className="relative shrink-0">
                        <IconTile icon={MessageCircleMore} tone={active ? "primary" : "warning"} size="md" className={active ? "bg-zalo-soft text-zalo" : undefined} />
                        <span className="absolute -right-1 -bottom-1 flex size-3.5" aria-hidden>
                          {active && <span className="absolute inset-0 animate-ping-soft rounded-full bg-success motion-reduce:hidden" />}
                          <span className={cn("relative size-3.5 rounded-full ring-2 ring-card", active ? "bg-success" : "bg-warning")} />
                        </span>
                      </span>
                      <div className="flex min-w-0 flex-col gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{c.name ?? "Zalo OA"}</span>
                          <span className="tabular rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">ID {c.externalId}</span>
                          {blocked ? (
                            <Badge variant="warning">
                              <CircleAlert aria-hidden />
                              Chưa gửi được tin
                            </Badge>
                          ) : active ? (
                            <Badge variant="success">
                              <CircleCheck aria-hidden />
                              Đang hoạt động
                            </Badge>
                          ) : (
                            <Badge variant="warning">
                              <CircleAlert aria-hidden />
                              Cần kết nối lại
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-pretty text-muted-foreground">
                          {blocked
                            ? `${errorLabel} Trong lúc chờ, tin khách vẫn vào Hộp thư và được chuyển cho nhân viên — hãy trả lời khách trong ứng dụng Zalo OA. Cảnh báo tự mất khi gửi được tin.`
                            : active
                              ? `Kết nối lúc ${formatDateTime(c.createdAt)}. Hệ thống tự gia hạn quyền truy cập, chỉ cần kết nối lại nếu Zalo báo lỗi.`
                              : `${errorLabel ?? "Kết nối không còn hiệu lực."} Bot đã dừng trả lời ở OA này cho tới khi bạn kết nối lại.`}
                        </p>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {!active && configured && (
                          <Button size="sm" onClick={() => void connect()} disabled={connecting}>
                            <RefreshCw aria-hidden />
                            Kết nối lại
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setConfirm(c)}
                        >
                          <Unplug aria-hidden />
                          Ngắt kết nối
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="tips-title" className="flex flex-col gap-3">
        <h2 id="tips-title" className="text-sm font-semibold">
          Lưu ý khi dùng
        </h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {tips.map((tip) => (
            <li key={tip.text} className="surface flex items-start gap-3 p-4 text-sm">
              <IconTile icon={tip.icon} tone={tip.tone} size="sm" />
              <span className="text-pretty text-muted-foreground">{tip.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ngắt kết nối OA?</AlertDialogTitle>
            <AlertDialogDescription>
              Bot sẽ ngừng trả lời tin nhắn gửi vào OA {confirm?.name ?? confirm?.externalId}. Lịch sử hội thoại vẫn được giữ. Bạn có thể kết nối lại bất
              cứ lúc nào.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Không</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (confirm) void disconnect(confirm);
                setConfirm(null);
              }}
            >
              Ngắt kết nối
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
