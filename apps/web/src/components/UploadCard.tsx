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
    <Card className="max-w-3xl">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-1">Upload Data</h2>
          <p className="text-muted-foreground text-sm">Select a CSV file to begin analysis.</p>
        </div>

        <Dropzone onFileSelect={onFileUpload} isLoading={isLoading} />

        <SampleButtons samples={samples} onSelect={onSampleSelect} isLoading={isLoading} />

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-3 items-center text-red-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5 flex-shrink-0"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
