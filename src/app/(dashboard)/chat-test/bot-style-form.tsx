"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CircleAlert, CircleCheck, LoaderCircle, Lock } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { toneOptions } from "./labels";

const maxInstructions = 1000;

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
          <div key={i} className="h-16 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
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
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
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
          className="gap-2"
        >
          {toneOptions.map((option) => (
            <Label
              key={option.value}
              htmlFor={`tone-${option.value}`}
              className={cn(
                "flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3 font-normal transition-colors hover:bg-muted/50",
                tone === option.value && "border-primary bg-accent/50",
                !canEdit && "cursor-not-allowed opacity-70",
              )}
            >
              <RadioGroupItem id={`tone-${option.value}`} value={option.value} className="mt-0.5" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-sm text-muted-foreground">{option.description}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      </fieldset>

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
