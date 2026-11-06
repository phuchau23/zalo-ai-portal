"use client";

import { useEffect, useState } from "react";
import { BellRing, CircleAlert, ExternalLink, LoaderCircle, RefreshCw, Send, Settings2, Unplug, UsersRound } from "lucide-react";
import { CopyButton } from "@/components/common/copy-button";
import { IconTile } from "@/components/common/icon-tile";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { call } from "@/lib/api/call";
import { api, type TelegramLinkCode } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { cn } from "@/lib/utils";

/** Mỗi 3 giây kiểm tra nhóm đã gõ mã chưa (Worker nhận lệnh rồi lưu chat id). */
const pollMs = 3000;

/** Ba bước kết nối, hiện trước khi bấm để người dùng biết sẽ làm gì. */
const steps = [
  { icon: Send, title: "Lấy mã kết nối", text: "Bấm nút bên dưới." },
  { icon: UsersRound, title: "Thêm bot vào nhóm", text: "Nhóm Telegram của nhân viên." },
  { icon: BellRing, title: "Gõ mã vào nhóm", text: "Xong là nhận thông báo." },
];

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
      <div className="flex items-start gap-3 rounded-2xl border border-dashed p-4">
        <IconTile icon={Send} tone="muted" size="md" />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold">Nhóm Telegram nhận thông báo</span>
          <p className="text-sm text-muted-foreground">Hệ thống chưa bật Telegram — liên hệ quản trị viên.</p>
        </div>
      </div>
    );
  }

  const command = link ? (link.botUsername ? `/ketnoi@${link.botUsername} ${link.code}` : `/ketnoi ${link.code}`) : "";
  const minutesLeft = link ? Math.max(0, Math.ceil((new Date(link.expiresAt).getTime() - now) / 60_000)) : 0;
  const connected = Boolean(chatId) && !link;

  return (
    <div className="flex flex-col gap-3">
      <div
        className={cn(
          "relative flex flex-col gap-4 overflow-hidden rounded-2xl border p-4 sm:p-5",
          connected ? "border-success/30 bg-success/[0.04]" : "bg-card shadow-card",
        )}
      >
        {/* Lưới chấm trang trí góc phải. */}
        <div aria-hidden className="pointer-events-none absolute -top-6 -right-6 size-40 bg-dot-grid [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />

        <div className="relative flex items-start gap-3">
          <IconTile icon={Send} tone={connected ? "success" : "primary"} variant="solid" size="md" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-semibold">Nhóm Telegram nhận thông báo</span>
            {connected ? (
              <span role="status" className="flex items-start gap-2 text-sm text-pretty text-success">
                <span className="relative mt-1.5 flex size-2 shrink-0" aria-hidden>
                  <span className="absolute inset-0 animate-ping-soft rounded-full bg-success motion-reduce:hidden" />
                  <span className="relative size-2 rounded-full bg-success" />
                </span>
                {justConnected ? "Kết nối thành công! Nhóm vừa nhận tin chào từ bot." : "Đang kết nối — nhóm nhận thông báo khi khách cần người."}
              </span>
            ) : link ? (
              <span className="text-sm text-muted-foreground">Làm theo hai bước bên dưới trong Telegram.</span>
            ) : (
              <span className="text-sm text-pretty text-muted-foreground">
                Chưa kết nối. Nhân viên sẽ nhận tin báo trên Telegram khi khách cần người, khách chờ lâu hoặc ca khẩn cấp.
              </span>
            )}
          </div>
        </div>

        {connected && canEdit && (
          <div className="relative flex flex-wrap gap-2 sm:pl-[52px]">
            <Button variant="outline" size="sm" className="h-11 bg-card sm:h-8" onClick={() => void createCode()} disabled={busy}>
              <RefreshCw aria-hidden />
              Đổi nhóm khác
            </Button>
            <Button variant="ghost" size="sm" className="h-11 sm:h-8" onClick={() => void disconnect()} disabled={busy}>
              <Unplug aria-hidden />
              Ngắt kết nối
            </Button>
          </div>
        )}

        {!chatId && !link && (
          <>
            <ol className="relative grid gap-2">
              {steps.map((step, i) => (
                <li key={step.title} className="flex items-center gap-3 rounded-xl border bg-background/80 p-3 backdrop-blur">
                  <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-active-gradient text-xs font-bold text-white" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="flex min-w-0 flex-col leading-tight">
                    <span className="text-[13px] font-semibold">{step.title}</span>
                    <span className="text-xs text-muted-foreground">{step.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            {canEdit && (
              <Button onClick={() => void createCode()} disabled={busy} className="relative h-11 w-fit sm:h-9">
                {busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Send aria-hidden />}
                Kết nối Telegram
              </Button>
            )}
          </>
        )}

        {link && (
          <div className="relative flex flex-col gap-4">
            {expired ? (
              <p className="flex items-center gap-2 rounded-xl bg-warning/10 px-3 py-2.5 text-sm font-medium text-warning">
                <CircleAlert className="size-4 shrink-0" aria-hidden />
                Mã đã hết hạn. Lấy mã mới để thử lại.
              </p>
            ) : (
              <>
                <ol className="flex flex-col gap-3">
                  {link.addToGroupUrl && (
                    <li className="flex gap-3">
                      <StepNumber n={1} />
                      <div className="flex flex-col gap-2 text-sm">
                        <span>Cách nhanh: bấm nút dưới, chọn nhóm nhân viên, Telegram tự thêm bot và gửi mã.</span>
                        <a
                          href={link.addToGroupUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(buttonVariants({ size: "sm" }), "flex h-11 w-fit sm:h-8")}
                        >
                          <ExternalLink aria-hidden />
                          Mở Telegram, chọn nhóm
                        </a>
                      </div>
                    </li>
                  )}
                  <li className="flex gap-3">
                    <StepNumber n={link.addToGroupUrl ? 2 : 1} />
                    <div className="flex min-w-0 flex-col gap-2 text-sm">
                      <span>
                        {link.addToGroupUrl ? "Hoặc làm tay: " : ""}thêm bot {link.botUsername ? <strong>@{link.botUsername}</strong> : "của hệ thống"} vào nhóm, rồi gõ vào nhóm:
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="rounded-xl border bg-background px-3.5 py-2 font-mono text-base font-semibold tracking-wider break-all select-all">{command}</code>
                        <CopyButton text={command} label="Chép lệnh" />
                      </div>
                    </div>
                  </li>
                </ol>
                <p role="status" className="flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2.5 text-sm text-primary">
                  <LoaderCircle className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden />
                  Đang chờ nhóm gõ mã… <span className="text-muted-foreground">(mã còn hiệu lực {minutesLeft} phút)</span>
                </p>
              </>
            )}
            <div className="flex flex-wrap gap-2">
              {expired && (
                <Button size="sm" className="h-11 sm:h-8" onClick={() => void createCode()} disabled={busy}>
                  <RefreshCw aria-hidden />
                  Lấy mã mới
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-11 sm:h-8" onClick={() => setLink(null)}>
                Hủy
              </Button>
            </div>
          </div>
        )}
      </div>

      {problem && (
        <p role="alert" className="flex items-center gap-1.5 rounded-xl bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {problemMessage(problem)}
        </p>
      )}

      {canEdit && (
        <details className="group text-sm">
          <summary className="inline-flex min-h-11 w-fit cursor-pointer items-center gap-1.5 rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:min-h-8">
            <Settings2 className="size-3.5" aria-hidden />
            Nhập chat id thủ công
          </summary>
          <div className="mt-2 flex flex-col gap-2 rounded-xl border bg-muted/30 p-3">
            <Label htmlFor="telegramChatId">Chat id nhóm</Label>
            <Input
              id="telegramChatId"
              value={chatId ?? ""}
              placeholder="-1001234567890"
              maxLength={50}
              aria-invalid={Boolean(error)}
              onChange={(e) => onManualChange(e.target.value)}
              className="bg-card font-mono sm:max-w-xs"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : <p className="text-muted-foreground">Bấm &quot;Lưu cài đặt&quot; bên dưới sau khi nhập.</p>}
          </div>
        </details>
      )}
    </div>
  );
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="tabular flex size-7 shrink-0 items-center justify-center rounded-full bg-active-gradient text-xs font-bold text-white shadow-glow" aria-hidden>
      {n}
    </span>
  );
}
