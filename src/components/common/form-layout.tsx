import type { ReactNode } from "react";

/**
 * Thanh "Lưu" dính đáy của form cài đặt nằm trong thẻ (SubNavLayout: thẻ có p-5 / md:p-6).
 * Điện thoại: đặt trên thanh menu dưới cùng (cao 4rem + vùng an toàn) để không bị che.
 */
export const stickySaveBar =
  "sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-5 -mb-5 mt-2 flex items-center justify-end gap-3 rounded-b-xl border-t bg-card/95 px-5 py-3 backdrop-blur supports-backdrop-filter:bg-card/85 md:bottom-0 md:-mx-6 md:-mb-6 md:px-6";

/** Một nhóm trong form cài đặt: tiêu đề + giải thích bên trái (màn rộng) hoặc bên trên, các ô nhập bên phải. */
export function FormGroup({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t py-6 first:border-t-0 first:pt-0 xl:grid-cols-[14rem_minmax(0,1fr)] xl:gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-sm text-pretty text-muted-foreground">{description}</p>
      </div>
      <div className="flex max-w-xl min-w-0 flex-col gap-5">{children}</div>
    </section>
  );
}
