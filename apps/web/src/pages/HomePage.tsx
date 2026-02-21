import { useState, useEffect } from "react";
import { UploadCard } from "../components/UploadCard";
import { ReportPreview } from "../components/ReportPreview";
import { BuildReport } from "../components/BuildReport";
import { ThemeSelector } from "../components/ThemeSelector";
import type { SampleFile, UploadResult } from "../lib/api";
import { fetchSamples, fetchSamplePreview, uploadFile } from "../lib/api";
import { withSmartLoading } from "../lib/loading";

export default function HomePage() {
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [samples, setSamples] = useState<SampleFile[]>([]);

  useEffect(() => {
    fetchSamples()
      .then(setSamples)
      .catch((err) => console.error("Failed to fetch samples:", err));
  }, []);

  async function handleSampleSelect(sampleId: string) {
    setErr(null);
    setUploadResult(null);

    const loadingTimer = window.setTimeout(() => {
      setIsLoading(true);
    }, 150);

    try {
      const result = await withSmartLoading(fetchSamplePreview(sampleId));
      setUploadResult(result);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      window.clearTimeout(loadingTimer);
      setIsLoading(false);
    }
  }

  async function handleFileUpload(file: File) {
    setErr(null);
    setUploadResult(null);

    const loadingTimer = window.setTimeout(() => {
      setIsLoading(true);
    }, 150);

    try {
      const result = await withSmartLoading(uploadFile(file));
      setUploadResult(result);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      window.clearTimeout(loadingTimer);
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <h1 className="text-5xl font-bold tracking-tight text-[var(--text-primary)]">
              ERP Export Analytics
            </h1>
            <p className="text-[var(--text-secondary)] mt-3 text-xl">
              Streamlined CSV processing and preview tool.
            </p>
          </div>
          <div className="flex justify-end">
            <ThemeSelector />
          </div>
        </header>

        <main className="space-y-12">
          <section>
            <UploadCard
              onFileUpload={handleFileUpload}
              onSampleSelect={handleSampleSelect}
              samples={samples}
              isLoading={isLoading}
              error={err}
            />
          </section>

          {uploadResult && (
            <>
              <section>
                <ReportPreview result={uploadResult} />
              </section>
              <section>
                <BuildReport uploadResult={uploadResult} />
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
