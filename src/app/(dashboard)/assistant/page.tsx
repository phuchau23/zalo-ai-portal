import type { Metadata } from "next";
import { FormGroup } from "@/components/common/form-layout";
import { BotStyleForm } from "../chat-test/bot-style-form";
import { SettingsForm } from "../settings/settings-form";

export const metadata: Metadata = { title: "Giọng văn & xưng hô — Remi" };

export default function Page() {
  return (
    <div className="flex flex-col">
      <SettingsForm sections={["bot"]} inlineSave />
      <div className="mt-6 border-t pt-6">
        <FormGroup
          title="Cách nói chuyện"
          description="Giọng văn và hướng dẫn riêng bot luôn làm theo. Đổi xong, mở Chat thử để nghe bot nói thử."
        >
          <BotStyleForm />
        </FormGroup>
      </div>
    </div>
  );
}
