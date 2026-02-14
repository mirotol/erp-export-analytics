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
          <h2 className="text-2xl font-semibold">Report Preview</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
            <p>
              <span className="text-foreground font-medium">File:</span> {result.fileName}
            </p>
            <p>
              <span className="text-foreground font-medium">Size:</span> {formatBytes(result.size)}
            </p>
            <p>
              <span className="text-foreground font-medium">ID:</span>{" "}
              <code className="bg-surface-hover px-1 rounded text-xs">{result.reportId}</code>
            </p>
          </div>
        </div>
      </div>

      <Card className="p-0 overflow-hidden border-accent/20">
        <Table columns={result.columns} rows={result.previewRows} />
        <div className="p-4 bg-surface-hover/30 border-t border-border">
          <p className="text-xs text-muted-foreground italic">
            Showing first {result.previewRows.length} rows for preview purposes.
          </p>
        </div>
      </Card>
    </section>
  );
}
