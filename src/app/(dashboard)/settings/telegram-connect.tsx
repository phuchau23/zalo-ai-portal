"use client";

import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, ExternalLink, LoaderCircle, Send, Unplug } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { call } from "@/lib/api/call";
import { api, type TelegramLinkCode } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { cn } from "@/lib/utils";

/** Mỗi 3 giây kiểm tra nhóm đã gõ mã chưa (Worker nhận lệnh rồi lưu chat id). */
const pollMs = 3000;

/**
 * Kết nối nhóm Telegram nhận thông báo, không cần biết "chat id": lấy mã → thêm bot vào nhóm → gõ lệnh có mã.
 * Ô nhập chat id thủ công vẫn giữ cho người rành kỹ thuật.
 */
export function TelegramConnect({
  ready,
  chatId,
  canEdit,
  error,
  onConnected,
  onManualChange,
}: {
  ready: boolean;
  chatId: string | null | undefined;
  canEdit: boolean;
  error?: string;
  onConnected: (chatId: string | null) => void;
  onManualChange: (chatId: string) => void;
}) {
  const [link, setLink] = useState<TelegramLinkCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ApiProblem | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [justConnected, setJustConnected] = useState(false);

  const expired = link ? new Date(link.expiresAt).getTime() <= now : false;

  // Đang chờ nhóm gõ mã: hỏi lại máy chủ định kỳ cho tới khi có chat id hoặc mã hết hạn.
  useEffect(() => {
    if (!link || expired) return;
    const timer = setInterval(async () => {
      setNow(Date.now());
      const result = await call(() => api.GET("/tenant/handoff-settings"));
      if (result.ok && result.data.telegramChatId) {
        onConnected(result.data.telegramChatId);
        setLink(null);
        setJustConnected(true);
      }
    }, pollMs);
    return () => clearInterval(timer);
  }, [link, expired, onConnected]);

  async function createCode() {
    setBusy(true);
    setProblem(null);
    setJustConnected(false);
    const result = await call(() => api.POST("/tenant/handoff-settings/telegram/link-code"));
    setBusy(false);
    if (!result.ok) return setProblem(result.problem);
    setNow(Date.now());
    setLink(result.data);
  }

  async function disconnect() {
    if (!window.confirm("Ngắt kết nối? Nhóm Telegram sẽ không nhận thông báo nữa.")) return;
    setBusy(true);
    setProblem(null);
    const result = await call(() => api.DELETE("/tenant/handoff-settings/telegram"));
    setBusy(false);
    if (!result.ok) return setProblem(result.problem);
    setJustConnected(false);
    onConnected(null);
  }

  if (!ready) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Nhóm Telegram nhận thông báo</span>
        <p className="text-sm text-muted-foreground">Hệ thống chưa bật Telegram — liên hệ quản trị viên.</p>
      </div>
    );
  }

  const command = link ? (link.botUsername ? `/ketnoi@${link.botUsername} ${link.code}` : `/ketnoi ${link.code}`) : "";
  const minutesLeft = link ? Math.max(0, Math.ceil((new Date(link.expiresAt).getTime() - now) / 60_000)) : 0;

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium">Nhóm Telegram nhận thông báo</span>

      {chatId && !link ? (
        <div className="flex flex-col gap-3 rounded-md border border-success/30 bg-success/5 p-3 sm:flex-row sm:items-center">
          <CircleCheck className="size-5 shrink-0 text-success" aria-hidden />
          <p role="status" className="flex-1 text-sm">
            {justConnected ? "Kết nối thành công! Nhóm vừa nhận tin chào từ bot." : "Đã kết nối một nhóm Telegram."}
          </p>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="h-11 sm:h-8" onClick={() => void createCode()} disabled={busy}>
                Đổi nhóm khác
              </Button>
              <Button variant="ghost" size="sm" className="h-11 sm:h-8" onClick={() => void disconnect()} disabled={busy}>
                <Unplug aria-hidden />
                Ngắt kết nối
              </Button>
            </div>
          )}
        </div>
      ) : !link ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-muted-foreground">Chưa kết nối. Nhân viên sẽ nhận tin báo trên Telegram khi khách cần người, khách chờ lâu hoặc ca khẩn cấp.</p>
          {canEdit && (
            <Button onClick={() => void createCode()} disabled={busy} className="h-11 sm:h-9">
              {busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Send aria-hidden />}
              Kết nối Telegram
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-4">
          {expired ? (
            <p className="text-sm">Mã đã hết hạn.</p>
          ) : (
            <>
              <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm">
                {link.addToGroupUrl && (
                  <li>
                    <span>Cách nhanh: bấm nút dưới, chọn nhóm nhân viên, Telegram tự thêm bot và gửi mã.</span>
                    <a
                      href={link.addToGroupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(buttonVariants({ size: "sm" }), "mt-2 flex h-11 w-fit sm:h-8")}
                    >
                      <ExternalLink aria-hidden />
                      Mở Telegram, chọn nhóm
                    </a>
                  </li>
                )}
                <li>
                  {link.addToGroupUrl ? "Hoặc làm tay: " : ""}thêm bot {link.botUsername ? <strong>@{link.botUsername}</strong> : "của hệ thống"} vào nhóm, rồi gõ vào nhóm:
                  <code className="mt-2 block w-fit rounded-md border bg-background px-3 py-2 font-mono text-base tracking-wider select-all">{command}</code>
                </li>
              </ol>
              <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
                Đang chờ nhóm gõ mã… (mã còn hiệu lực {minutesLeft} phút)
              </p>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            {expired && (
              <Button size="sm" className="h-11 sm:h-8" onClick={() => void createCode()} disabled={busy}>
                Lấy mã mới
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-11 sm:h-8" onClick={() => setLink(null)}>
              Hủy
            </Button>
          </div>
        </div>
      )}

      {problem && (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(problem)}
        </p>
      )}

      {canEdit && (
        <details className="group text-sm">
          <summary className="w-fit cursor-pointer rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            Nhập chat id thủ công
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            <Label htmlFor="telegramChatId">Chat id nhóm</Label>
            <Input
              id="telegramChatId"
              value={chatId ?? ""}
              placeholder="-1001234567890"
              maxLength={50}
              aria-invalid={Boolean(error)}
              onChange={(e) => onManualChange(e.target.value)}
              className="sm:max-w-xs"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : <p className="text-muted-foreground">Bấm &quot;Lưu cài đặt&quot; bên dưới sau khi nhập.</p>}
          </div>
        </details>
      )}
    </div>
  );
}
