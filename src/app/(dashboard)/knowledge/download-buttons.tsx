import { Download, FileJson, FileSpreadsheet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/**
 * Tải file mẫu / xuất dữ liệu: link thường tới /api (trình duyệt tự gửi cookie và tự lưu file).
 * Dùng <a> vì đây là file tải về, không phải trang của Next.js.
 */
export function DownloadButtons({ showTemplate = true, showExport = true }: { showTemplate?: boolean; showExport?: boolean }) {
  const style = buttonVariants({ variant: "outline" });
  return (
    <>
      {showTemplate && (
        <a className={style} href="/api/knowledge/template" download>
          <FileSpreadsheet aria-hidden />
          Tải file mẫu Excel
        </a>
      )}
      {showExport && (
        <>
          <a className={style} href="/api/knowledge/export?format=xlsx" download>
            <Download aria-hidden />
            Xuất Excel
          </a>
          <a className={style} href="/api/knowledge/export?format=json" download>
            <FileJson aria-hidden />
            Xuất JSON
          </a>
        </>
      )}
    </>
  );
}
