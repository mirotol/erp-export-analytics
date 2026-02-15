import { useState, useEffect } from "react";
import { UploadCard } from "../components/UploadCard";
import { ReportPreview } from "../components/ReportPreview";
import { BuildReport } from "../components/BuildReport";
import type { SampleFile, UploadResult } from "../lib/api";
import { fetchSamples, fetchSamplePreview, uploadFile } from "../lib/api";

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
    setIsLoading(true);
    setErr(null);
    setUploadResult(null);

    try {
      const result = await fetchSamplePreview(sampleId);
      setUploadResult(result);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFileUpload(file: File) {
    setIsLoading(true);
    setErr(null);
    setUploadResult(null);

    try {
      const result = await uploadFile(file);
      setUploadResult(result);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-bold tracking-tight text-foreground">
              ERP Export Analytics{" "}
              <span className="text-accent text-xl font-medium ml-2 opacity-80">(POC)</span>
            </h1>
            <p className="text-muted-foreground mt-3 text-xl">
              Streamlined CSV processing and preview tool.
            </p>
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
