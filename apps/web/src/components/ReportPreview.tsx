import { Card } from "./Card";
import { Table } from "./Table";
import type { UploadResult } from "../lib/api";
import { formatBytes } from "../lib/format";

interface ReportPreviewProps {
  result: UploadResult;
}

export function ReportPreview({ result }: ReportPreviewProps) {
  return (
    <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Report Preview</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-base text-[var(--text-secondary)]">
            <p>
              <span className="text-[var(--text-primary)] font-medium">File:</span>{" "}
              <code className="bg-[var(--surface-elevated)] px-1 rounded text-s">
                {result.fileName}
              </code>
            </p>
            <p>
              <span className="text-[var(--text-primary)] font-medium">Size:</span>{" "}
              <code className="bg-[var(--surface-elevated)] px-1 rounded text-s">
                {formatBytes(result.size)}
              </code>
            </p>
            <p>
              <span className="text-[var(--text-primary)] font-medium">ID:</span>{" "}
              <code className="bg-[var(--surface-elevated)] px-1 rounded text-s">
                {result.reportId}
              </code>
            </p>
          </div>
        </div>
      </div>

      <Card className="p-0 overflow-hidden border-[var(--accent)]">
        <Table columns={result.columns} rows={result.previewRows} />
        <div className="p-4 bg-[var(--white-02)] border-t border-[var(--border)]">
          <p className="text-sm text-[var(--muted)] italic">
            Showing first {result.previewRows.length} rows for preview purposes.
          </p>
        </div>
      </Card>
    </section>
  );
}
