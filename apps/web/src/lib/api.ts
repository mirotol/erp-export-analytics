export interface UploadResult {
  reportId: string;
  fileName: string;
  size: number;
  columns: string[];
  previewRows: string[][];
}

export interface SampleFile {
  id: string;
  fileName: string;
  title: string;
  rows: number;
}

export async function fetchSamples(): Promise<SampleFile[]> {
  const res = await fetch("/api/samples");
  if (!res.ok) {
    throw new Error(`Failed to fetch samples (HTTP ${res.status})`);
  }
  return res.json();
}

export async function fetchSamplePreview(sampleId: string): Promise<UploadResult> {
  const res = await fetch(`/api/samples/${sampleId}?view`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Failed to load sample (HTTP ${res.status})`);
  }
  return res.json();
}

export interface ReportConfig {
  groupBy: string[];
  metrics: { op: "count" | "sum"; field?: string }[];
  filters: { field: string; op: "eq" | "contains"; value: string }[];
  limit: number;
}

export interface ReportResult {
  columns: string[];
  rows: string[][];
  rowsScanned: number;
}

export async function runReport(reportId: string, config: ReportConfig): Promise<ReportResult> {
  const res = await fetch(`/api/reports/${reportId}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(config),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Report failed (HTTP ${res.status})`);
  }

  return res.json();
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/upload", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Upload failed (HTTP ${res.status})`);
  }

  return res.json();
}
