"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, Info, LoaderCircle, Lock, MessageCircleMore, Plug, RefreshCw, Unplug } from "lucide-react";
import { EmptyState, ErrorState, LoadingRows } from "@/components/common/states";
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
import { useApiData } from "@/lib/use-api-data";
import { callbackNotice, connectionErrorLabel, type CallbackNotice } from "./callback-messages";

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
    <Button onClick={() => void connect()} disabled={connecting}>
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

      <section aria-labelledby="zalo-title" className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <MessageCircleMore className="size-5" aria-hidden />
            </div>
            <div className="flex flex-col gap-1">
              <h2 id="zalo-title" className="font-semibold">
                Zalo Official Account
              </h2>
              <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
                Bot trả lời tin nhắn khách gửi vào OA 24/7. Bạn cần là quản trị viên của OA; hệ thống chỉ nhận quyền gửi và đọc tin, không bao giờ hỏi
                mật khẩu Zalo.
              </p>
            </div>
          </div>
          {connections.length > 0 && <div className="shrink-0">{connectButton}</div>}
        </div>

        {problem && !data && <ErrorState problem={problem} onRetry={reload} />}
        {loading && !data && !problem && <LoadingRows rows={1} columns={3} />}

        {data && connections.length === 0 && (
          <EmptyState
            icon={Plug}
            title="Chưa kết nối OA nào"
            description="Bấm nút bên dưới, đăng nhập Zalo bằng tài khoản quản trị OA và chọn OA muốn kết nối. Sau khi đồng ý, bạn sẽ được đưa về lại trang này."
          >
            {connectButton}
          </EmptyState>
        )}

        {connections.length > 0 && (
          <ul className="flex flex-col divide-y rounded-md border" aria-label="OA đã kết nối">
            {connections.map((c) => {
              const active = c.status === "active";
              const errorLabel = connectionErrorLabel(c.lastError);
              return (
                <li key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{c.name ?? "Zalo OA"}</span>
                      <span className="tabular font-mono text-xs text-muted-foreground">ID {c.externalId}</span>
                      {active ? (
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
                    <p className="text-sm text-muted-foreground">
                      {active
                        ? `Kết nối lúc ${formatDateTime(c.createdAt)}. Hệ thống tự gia hạn quyền truy cập, chỉ cần kết nối lại nếu Zalo báo lỗi.`
                        : `${errorLabel ?? "Kết nối không còn hiệu lực."} Bot đã dừng trả lời ở OA này cho tới khi bạn kết nối lại.`}
                    </p>
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
      </section>

      <section aria-labelledby="tips-title" className="flex flex-col gap-2 rounded-lg border border-dashed p-4 text-sm">
        <h2 id="tips-title" className="font-medium">
          Lưu ý khi dùng
        </h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-muted-foreground">
          <li>Nhân viên vẫn trả lời được ngay trong ứng dụng Zalo OA. Khi đó bot tự dừng ở cuộc trò chuyện đó để không chen vào.</li>
          <li>Tin đầu tiên bot gửi cho mỗi khách luôn kèm câu báo đây là trợ lý AI và link chính sách bảo mật trong Cài đặt.</li>
          <li>Zalo chỉ cho OA nhắn khách đã tương tác trong 7 ngày; trong 48 giờ sau tin cuối của khách, tin tư vấn được miễn phí.</li>
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
