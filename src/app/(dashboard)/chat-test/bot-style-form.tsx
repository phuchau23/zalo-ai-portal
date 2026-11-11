"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bot, BriefcaseBusiness, CircleAlert, CircleCheck, LoaderCircle, Lock, MessagesSquare, Smile, Zap, type LucideIcon } from "lucide-react";
import { ErrorState } from "@/components/common/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/components/session/session-provider";
import { call } from "@/lib/api/call";
import { api } from "@/lib/api/client";
import { problemMessage, type ApiProblem } from "@/lib/api/problem";
import { easeOut } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { toneOptions } from "./labels";

const maxInstructions = 1000;

const toneIcons: Record<string, LucideIcon> = { human: MessagesSquare, friendly: Smile, professional: BriefcaseBusiness, concise: Zap };

/** Vài tin minh họa cho từng giọng văn (chỉ để người dùng hình dung, không phải câu bot sẽ gửi). */
const toneSamples: Record<string, string[]> = {
  human: ["Dạ chị ơi, em chào chị nha 😊", "Dịch vụ này bên em làm khoảng 60 phút ạ", "Chị muốn em giữ chỗ giờ nào cho mình nè?"],
  friendly: ["Chào chị ạ 🌿 Em gửi chị thông tin dịch vụ nhé. Chị cần em tư vấn thêm gì cứ nhắn em nha!"],
  professional: ["Kính chào quý khách. Em xin gửi thông tin dịch vụ như sau. Quý khách cần hỗ trợ thêm, vui lòng cho em biết ạ."],
  concise: ["Dạ, dịch vụ này 60 phút. Chị muốn đặt giờ nào ạ?"],
};

/** Giọng văn + hướng dẫn thêm cho bot. Áp dụng ngay từ tin tiếp theo, kể cả trong khung chat thử. */
export function BotStyleForm() {
  const { me } = useSession();
  const canEdit = me.currentTenant?.role === "owner";
  const [tone, setTone] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");
  const [loadProblem, setLoadProblem] = useState<ApiProblem | null>(null);
  const [saveProblem, setSaveProblem] = useState<ApiProblem | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await call(() => api.GET("/tenant/settings"));
      if (cancelled) return;
      if (!result.ok) return setLoadProblem(result.problem);
      setTone(result.data.botTone);
      setInstructions(result.data.botInstructions ?? "");
    })();
    return () => {
      cancelled = true;
    };
  }, [me.currentTenant?.id]);

  if (loadProblem) return <ErrorState problem={loadProblem} />;
  if (tone === null) {
    return (
      <div role="status" aria-label="Đang tải giọng văn" className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="skeleton h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tone) return;
    setSaving(true);
    setSaveProblem(null);
    const result = await call(() =>
      api.PUT("/tenant/bot-style", { body: { botTone: tone, botInstructions: instructions.trim() ? instructions.trim() : null } }),
    );
    setSaving(false);
    if (result.ok) {
      setSaved(true);
      setDirty(false);
    } else {
      setSaveProblem(result.problem);
    }
  }

  const instructionsError = saveProblem?.fieldErrors.botInstructions;

  return (
    <form onSubmit={onSubmit} noValidate className="@container flex flex-col gap-5">
      {!canEdit && (
        <Alert>
          <Lock aria-hidden />
          <AlertDescription>Chỉ chủ doanh nghiệp được đổi giọng văn của bot.</AlertDescription>
        </Alert>
      )}
      {saveProblem && !instructionsError && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>{problemMessage(saveProblem)}</AlertDescription>
        </Alert>
      )}

      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-2.5 text-sm font-semibold">Giọng văn</legend>
        <RadioGroup
          value={tone}
          onValueChange={(value) => {
            setTone(value);
            setDirty(true);
            setSaved(false);
          }}
          disabled={!canEdit}
          className="grid gap-2 @2xl:grid-cols-2"
        >
          {toneOptions.map((option) => {
            const Icon = toneIcons[option.value] ?? MessagesSquare;
            const active = tone === option.value;
            return (
              <Label
                key={option.value}
                htmlFor={`tone-${option.value}`}
                className={cn(
                  "relative flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border bg-card p-3 font-normal transition-[border-color,background-color,box-shadow] hover:border-primary/30 hover:bg-accent/40",
                  active && "border-primary/50 bg-accent/60 shadow-card ring-1 ring-primary/20",
                  !canEdit && "cursor-not-allowed opacity-70",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                    active ? "bg-active-gradient text-white shadow-glow" : "bg-muted text-muted-foreground",
                  )}
                  aria-hidden
                >
                  <Icon className="size-4" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm leading-snug font-medium">{option.label}</span>
                  <span className="text-[13px] leading-snug text-pretty text-muted-foreground">{option.description}</span>
                </span>
                <RadioGroupItem id={`tone-${option.value}`} value={option.value} className="mt-0.5" />
              </Label>
            );
          })}
        </RadioGroup>
      </fieldset>

      <TonePreview tone={tone} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="botInstructions" className="font-semibold">
          Hướng dẫn thêm cho bot
        </Label>
        <Textarea
          id="botInstructions"
          value={instructions}
          maxLength={maxInstructions}
          rows={5}
          disabled={!canEdit}
          placeholder="Ví dụ: Luôn mời khách đặt lịch trước để được giảm 10%. Gọi khách là anh/chị."
          aria-invalid={Boolean(instructionsError)}
          aria-describedby={instructionsError ? "botInstructions-error" : "botInstructions-hint"}
          onChange={(e) => {
            setInstructions(e.target.value);
            setDirty(true);
            setSaved(false);
          }}
        />
        {instructionsError ? (
          <p id="botInstructions-error" className="flex items-center gap-1.5 text-sm text-destructive">
            <CircleAlert className="size-3.5 shrink-0" aria-hidden />
            {instructionsError}
          </p>
        ) : (
          <p id="botInstructions-hint" className="flex justify-between gap-3 text-sm text-muted-foreground">
            <span>Bot làm theo khi không trái quy tắc an toàn (không bịa giá, không hứa kết quả...).</span>
            <span className="tabular shrink-0">
              {instructions.length}/{maxInstructions}
            </span>
          </p>
        )}
      </div>

      {canEdit && (
        <div className="flex items-center justify-end gap-3">
          <p role="status" className="mr-auto text-sm text-muted-foreground">
            {saved ? (
              <span className="inline-flex items-center gap-1.5 text-success">
                <CircleCheck className="size-4" aria-hidden />
                Đã lưu, áp dụng từ tin tiếp theo
              </span>
            ) : (
              dirty && "Có thay đổi chưa lưu"
            )}
          </p>
          <Button type="submit" disabled={saving || !dirty}>
            {saving && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden />}
            {saving ? "Đang lưu..." : "Lưu giọng văn"}
          </Button>
        </div>
      )}
    </form>
  );
}

/** Khung chat nhỏ minh họa giọng văn đang chọn (đổi giọng thì tin minh họa đổi theo). */
function TonePreview({ tone }: { tone: string }) {
  const samples = toneSamples[tone] ?? toneSamples.human;
  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-canvas bg-dot-grid p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ai">
        <Bot className="size-3" aria-hidden />
        Ví dụ bot sẽ nhắn kiểu này
      </p>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tone}
          className="flex items-end gap-2"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: easeOut }}
        >
          <span
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm"
            aria-hidden
          >
            <Bot className="size-3.5" />
          </span>
          <div className="flex min-w-0 flex-col items-start gap-0.5">
            {samples.map((text, i) => (
              <p
                key={i}
                className={cn(
                  "max-w-full border border-ai/15 bg-ai-soft px-3 py-1.5 text-[13px] leading-relaxed text-pretty",
                  samples.length === 1
                    ? "rounded-2xl rounded-bl-md"
                    : i === 0
                      ? "rounded-2xl rounded-bl-md"
                      : i === samples.length - 1
                        ? "rounded-2xl rounded-tl-md"
                        : "rounded-2xl rounded-l-md",
                )}
              >
                {text}
              </p>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
