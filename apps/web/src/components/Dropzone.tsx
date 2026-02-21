import { useState, useRef } from "react";
import { UploadCloud, AlertCircle } from "lucide-react";

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  isLoading?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function Dropzone({ onFileSelect, accept = ".csv", isLoading }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    setError(null);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file.");
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File is too big. Maximum size is 10MB.");
      return false;
    }

    return true;
  };

  const handleFile = (file: File) => {
    if (validateFile(file)) {
      onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) setIsDragActive(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (isLoading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-10
          flex flex-col items-center justify-center gap-3
          transition-all cursor-pointer text-center
          ${isDragActive ? "border-(--accent) bg-(--accent-transparent) scale-[1.01]" : "border-(--border) hover:border-(--accent) hover:bg-(--surface-elevated)"}
          ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleFile(file);
            }
            // Reset input so the same file can be selected again if needed
            e.target.value = "";
          }}
          accept={accept}
          className="hidden"
        />

        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center ${error ? "bg-(--error-bg) text-(--error)" : "bg-(--accent-transparent) text-(--accent)"}`}
        >
          <UploadCloud className="w-6 h-6" />
        </div>

        <div>
          <p className="font-medium text-(--text-primary)">
            {isLoading ? "Uploading..." : "Click to upload or drag and drop"}
          </p>
          <p className="text-base text-(--muted) mt-1">Only CSV files are supported (max 10MB)</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-(--error) text-sm bg-(--error-bg) border border-(--error-border) p-3 rounded-lg animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
