import { AlertCircle } from "lucide-react";
import { Card } from "./Card";
import { Dropzone } from "./Dropzone";
import { SampleButtons } from "./SampleButtons";
import type { SampleFile } from "../lib/api";

interface UploadCardProps {
  onFileUpload: (file: File) => void;
  onSampleSelect: (id: string) => void;
  samples: SampleFile[];
  isLoading: boolean;
  error: string | null;
}

export function UploadCard({
  onFileUpload,
  onSampleSelect,
  samples,
  isLoading,
  error,
}: UploadCardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1 text-(--text-primary)">Upload Data</h2>
        <p className="text-(--text-secondary) text-base">Select a CSV file to begin analysis.</p>
      </div>

      <Card className="max-w-3xl">
        <div className="space-y-6">
          <Dropzone onFileSelect={onFileUpload} isLoading={isLoading} />

          <SampleButtons samples={samples} onSelect={onSampleSelect} isLoading={isLoading} />

          {error && (
            <div className="p-4 bg-(--error-bg) border border-(--error-border) rounded-lg flex gap-3 items-center text-(--error)">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-base font-medium">{error}</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
