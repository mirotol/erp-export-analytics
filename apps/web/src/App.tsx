import { useEffect, useState } from "react";

type Health = { status: string; time: string };

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch((e) => setErr(String(e)));
  }, []);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setErr(null);
    setUploadResult(null);

    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Upload failed (HTTP ${res.status})`);
      }

      const json = await res.json();
      setUploadResult(json);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    }
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 900 }}>
      <h1>ERP Export Analytics (POC)</h1>

      <section style={{ marginTop: 16 }}>
        <h2>Backend health</h2>
        {health ? <pre>{JSON.stringify(health, null, 2)}</pre> : <p>Loading...</p>}
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Upload CSV/XLSX</h2>
        <input type="file" accept=".csv,.xlsx" onChange={onFileChange} />
        {err && <p style={{ color: "crimson" }}>{err}</p>}
        {uploadResult && (
          <>
            <h3>Upload result</h3>
            <pre>{JSON.stringify(uploadResult, null, 2)}</pre>
          </>
        )}
      </section>
    </div>
  );
}
