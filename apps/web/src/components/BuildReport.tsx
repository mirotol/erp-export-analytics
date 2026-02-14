import { useState } from "react";
import { LayoutList, Info, BarChart3, Filter, AlertCircle } from "lucide-react";
import type { UploadResult, ReportResult, ReportConfig } from "../lib/api";
import { runReport } from "../lib/api";
import { Card } from "./Card";
import { Button } from "./Button";
import { ReportResults } from "./ReportResults";

interface BuildReportProps {
  uploadResult: UploadResult;
}

export function BuildReport({ uploadResult }: BuildReportProps) {
  const [groupBy, setGroupBy] = useState<string>("");
  const [includeCount, setIncludeCount] = useState(true);
  const [useSum, setUseSum] = useState(false);
  const [sumField, setSumField] = useState<string>("");
  const [filterField, setFilterField] = useState<string>("");
  const [filterOp, setFilterOp] = useState<"eq" | "contains">("eq");
  const [filterValue, setFilterValue] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);

  const numericColumns = uploadResult.columns.filter((_, colIdx) => {
    // Check first 50 rows (previewRows) to see if values are numeric
    return uploadResult.previewRows.some((row) => {
      const val = row[colIdx];
      return val !== "" && !isNaN(Number(val));
    });
  });

  // Identify columns with high uniqueness (e.g., IDs)
  const highUniquenessColumns = uploadResult.columns.filter((_, colIdx) => {
    if (uploadResult.previewRows.length === 0) return false;
    const values = uploadResult.previewRows.map((row) => row[colIdx]);
    const uniqueValues = new Set(values);
    // If more than 90% of values are unique, consider it high uniqueness
    return uniqueValues.size / values.length > 0.9;
  });

  const handleRun = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const config: ReportConfig = {
        groupBy: groupBy ? [groupBy] : [],
        metrics: [],
        filters: [],
        limit: 1000,
      };

      if (includeCount) {
        config.metrics.push({ op: "count" });
      }
      if (useSum && sumField) {
        config.metrics.push({ op: "sum", field: sumField });
      }
      if (filterField && filterValue) {
        config.filters.push({ field: filterField, op: filterOp, value: filterValue });
      }

      const res = await runReport(uploadResult.reportId, config);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run report");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Build Report</h2>
      </div>

      <Card>
        <div className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Group By */}
            <div className="space-y-3">
              <label className="text-base font-medium text-muted-foreground flex items-center gap-2">
                <LayoutList className="w-5 h-5 text-accent" />
                Group by
              </label>
              <select
                className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-accent outline-none transition-all"
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
              >
                <option value="">None</option>
                {uploadResult.columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
              {groupBy && highUniquenessColumns.includes(groupBy) && (
                <p className="text-s text-amber-400/80 ml-1 flex items-center gap-2">
                  <Info className="w-7 h-7" />
                  This column appears to contain mostly unique values.
                </p>
              )}
            </div>

            {/* Metrics */}
            <div className="space-y-3">
              <label className="text-base font-medium text-muted-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-accent" />
                Metrics
              </label>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={includeCount}
                      onChange={(e) => setIncludeCount(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-10 h-5 bg-border rounded-full peer peer-checked:bg-accent transition-colors"></div>
                    <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                  </div>
                  <span className="text-base group-hover:text-foreground transition-colors">
                    Count rows
                  </span>
                </label>

                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={useSum}
                        onChange={(e) => setUseSum(e.target.checked)}
                        className="peer sr-only"
                      />
                      <div className="w-10 h-5 bg-border rounded-full peer peer-checked:bg-accent transition-colors"></div>
                      <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
                    </div>
                    <span className="text-base group-hover:text-foreground transition-colors">
                      Sum field
                    </span>
                  </label>

                  {useSum && (
                    <div className="space-y-1">
                      <select
                        className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-accent outline-none disabled:opacity-50"
                        value={sumField}
                        onChange={(e) => setSumField(e.target.value)}
                        disabled={numericColumns.length === 0}
                      >
                        <option value="">
                          {numericColumns.length === 0
                            ? "No numeric fields found"
                            : "Select numeric field"}
                        </option>
                        {numericColumns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                      {numericColumns.length === 0 && (
                        <p className="text-xs text-muted-foreground ml-1">
                          Only numeric columns can be summed.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Filter */}
            <div className="space-y-3 lg:col-span-1">
              <label className="text-base font-medium text-muted-foreground flex items-center gap-2">
                <Filter className="w-5 h-5 text-accent" />
                Filter (Optional)
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <select
                    className="flex-1 bg-surface-hover border border-border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-accent outline-none"
                    value={filterField}
                    onChange={(e) => setFilterField(e.target.value)}
                  >
                    <option value="">Select Column</option>
                    {uploadResult.columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  <select
                    className="w-28 bg-surface-hover border border-border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-accent outline-none"
                    value={filterOp}
                    onChange={(e) => setFilterOp(e.target.value as "eq" | "contains")}
                  >
                    <option value="eq">equals</option>
                    <option value="contains">contains</option>
                  </select>
                </div>
                <input
                  type="text"
                  placeholder="Filter value..."
                  className="w-full bg-surface-hover border border-border rounded-lg px-3 py-2 text-base focus:ring-2 focus:ring-accent outline-none"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 pt-4 border-t border-border/50">
            <Button
              onClick={handleRun}
              isLoading={isLoading}
              className="w-full md:w-48 py-2.5 h-11"
            >
              Run Report
            </Button>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-base rounded-lg flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}
          </div>
        </div>
      </Card>

      {result && (
        <section>
          <ReportResults result={result} />
        </section>
      )}
    </div>
  );
}
