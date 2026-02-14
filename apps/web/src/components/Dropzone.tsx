import { useState, useRef } from "react";
import { UploadCloud } from "lucide-react";

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  isLoading?: boolean;
}

export function Dropzone({ onFileSelect, accept = ".csv", isLoading }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isLoading) setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (isLoading) return;

    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".csv")) {
      onFileSelect(file);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isLoading && fileInputRef.current?.click()}
      className={`
        relative border-2 border-dashed rounded-xl p-10
        flex flex-col items-center justify-center gap-3
        transition-all cursor-pointer text-center
        ${isDragActive ? "border-accent bg-accent/5 scale-[1.01]" : "border-border hover:border-accent/50 hover:bg-surface-hover"}
        ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
        accept={accept}
        className="hidden"
      />

      <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
        <UploadCloud className="w-6 h-6" />
      </div>

      <div>
        <p className="font-medium text-foreground">
          {isLoading ? "Uploading..." : "Click to upload or drag and drop"}
        </p>
        <p className="text-base text-muted-foreground mt-1">
          Only CSV files are supported (max 10MB)
        </p>
      </div>
    </div>
  );
}
