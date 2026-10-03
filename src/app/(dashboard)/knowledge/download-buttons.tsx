import { buttonVariants } from "@/components/ui/button";

/**
 * Tải file mẫu / xuất dữ liệu: link thường tới /api (trình duyệt tự gửi cookie và tự lưu file).
 * Dùng <a> vì đây là file tải về, không phải trang của Next.js.
 */
export function DownloadButtons({ showTemplate = true, showExport = true }: { showTemplate?: boolean; showExport?: boolean }) {
  const style = buttonVariants({ variant: "outline", size: "sm" });
  return (
    <>
      {showTemplate && (
        <a className={style} href="/api/knowledge/template" download>
          Tải file mẫu Excel
        </a>
      )}
      {showExport && (
        <>
          <a className={style} href="/api/knowledge/export?format=xlsx" download>
            Xuất Excel
          </a>
          <a className={style} href="/api/knowledge/export?format=json" download>
            Xuất JSON
          </a>
        </>
      )}
    </>
  );
}
