import { useState, useRef, useEffect, useMemo } from "react";
import { LayoutList, Info, BarChart3, Filter, AlertCircle, Plus, X } from "lucide-react";
import type { UploadResult, ReportResult, ReportConfig } from "../lib/api";
import { runReport } from "../lib/api";
import { withSmartLoading } from "../lib/loading";
import { Card } from "./Card";
import { Button } from "./Button";
import { ReportResults } from "./ReportResults";

interface BuildReportProps {
  uploadResult: UploadResult;
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="inline-flex items-center gap-2 bg-(--surface-elevated) border border-(--border) rounded-full px-3 py-1 text-sm text-(--text-primary) shadow-sm animate-in fade-in zoom-in duration-200">
      <span className="max-w-37.5 truncate">{label}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="p-0.5 rounded-full hover:bg-(--bg-hover) text-(--text-secondary) hover:text-(--error) transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function Popover({
  children,
  isOpen,
  onClose,
  trigger,
}: {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {trigger}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-(--surface-elevated) border border-(--border) rounded-xl shadow-2xl py-2 min-w-50 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

export function BuildReport({ uploadResult }: BuildReportProps) {
  const [groupBy, setGroupBy] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<ReportConfig["metrics"]>([]);
  const [filters, setFilters] = useState<ReportConfig["filters"]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);

  const [openPopover, setOpenPopover] = useState<string | null>(null);

  // New filter states
  const [newFilterField, setNewFilterField] = useState("");
  const [newFilterOp, setNewFilterOp] = useState<"eq" | "contains">("eq");
  const [newFilterValue, setNewFilterValue] = useState("");

  const numericColumns = uploadResult.columns.filter((_, colIdx) => {
    return uploadResult.previewRows.some((row) => {
      const val = row[colIdx];
      return val !== "" && !isNaN(Number(val));
    });
  });

  const { groupCount, totalPreviewRows, isHighCardinality } = useMemo(() => {
    const total = uploadResult.previewRows.length;
    if (groupBy.length === 0 || total === 0) {
      return { groupCount: 0, totalPreviewRows: total, isHighCardinality: false };
    }

    const indices = groupBy.map((dim) => uploadResult.columns.indexOf(dim));
    const combinations = new Set();
    for (const row of uploadResult.previewRows) {
      const key = indices.map((idx) => row[idx]).join("\x1f");
      combinations.add(key);
    }
    const count = combinations.size;
    return {
      groupCount: count,
      totalPreviewRows: total,
      isHighCardinality: count / total >= 0.9,
    };
  }, [groupBy, uploadResult.columns, uploadResult.previewRows]);

  const handleRun = async () => {
    setResult(null);
    setError(null);

    const loadingTimer = window.setTimeout(() => {
      setIsLoading(true);
    }, 150);

    try {
      const config: ReportConfig = {
        groupBy,
        metrics: metrics.length > 0 ? metrics : [{ op: "count" }],
        filters,
        limit: 1000,
      };

      const res = await withSmartLoading(runReport(uploadResult.reportId, config));
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run report");
    } finally {
      window.clearTimeout(loadingTimer);
      setIsLoading(false);
    }
  };

  const addMetric = (op: "count" | "sum" | "avg", field?: string) => {
    setMetrics([...metrics, { op, field }]);
    setOpenPopover(null);
  };

  const addFilter = () => {
    if (!newFilterField || !newFilterValue) return;
    setFilters([...filters, { field: newFilterField, op: newFilterOp, value: newFilterValue }]);
    setNewFilterField("");
    setNewFilterValue("");
    setOpenPopover(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-(--text-primary)">Build Report</h2>
      </div>

      <Card>
        <div className="p-8 space-y-10">
          <div className="grid grid-cols-1 gap-10">
            {/* Group By Section */}
            <div className="space-y-4">
              <label className="text-sm font-semibold uppercase tracking-wider text-(--text-secondary) flex items-center gap-2">
                <LayoutList className="w-4 h-4" />
                Dimensions (Group By)
              </label>
              <div className="flex flex-wrap items-center gap-3 p-4 bg-(--bg-subtle) rounded-xl border border-(--border-subtle) min-h-16">
                {groupBy.map((field, idx) => (
                  <Chip
                    key={`${field}-${idx}`}
                    label={field}
                    onRemove={() => setGroupBy(groupBy.filter((_, i) => i !== idx))}
                  />
                ))}
                <Popover
                  isOpen={openPopover === "group"}
                  onClose={() => setOpenPopover(null)}
                  trigger={
                    <button
                      onClick={() => setOpenPopover("group")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-(--surface-elevated) hover:bg-(--bg-hover) text-(--accent) transition-all border border-(--border)"
                    >
                      <Plus className="w-4 h-4" />
                      Add Dimension
                    </button>
                  }
                >
                  <div className="w-64">
                    <div className="px-4 py-2 text-xs font-bold text-(--muted) uppercase tracking-widest border-b border-(--border-subtle)">
                      Select Field
                    </div>
                    {uploadResult.columns
                      .filter((col) => !groupBy.includes(col))
                      .map((col) => (
                        <button
                          key={col}
                          className="w-full text-left px-4 py-2.5 text-base hover:bg-(--bg-hover) text-(--text-primary) transition-colors flex items-center justify-between group"
                          onClick={() => {
                            setGroupBy([...groupBy, col]);
                            setOpenPopover(null);
                          }}
                        >
                          {col}
                        </button>
                      ))}
                  </div>
                </Popover>
              </div>
              {isHighCardinality && (
                <div className="flex items-start gap-3 p-3 bg-(--bg-subtle) border border-(--border-subtle) rounded-xl text-sm text-(--warning-muted) animate-in fade-in slide-in-from-top-1 duration-200">
                  <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                  <p className="leading-relaxed">
                    Grouping by <span className="font-semibold">{groupBy.join(" + ")}</span> will
                    produce <span className="font-semibold">{groupCount}</span> groups out of{" "}
                    <span className="font-semibold">{totalPreviewRows}</span> rows. Aggregation may
                    not be meaningful.
                  </p>
                </div>
              )}
            </div>

            {/* Metrics Section */}
            <div className="space-y-4">
              <label className="text-sm font-semibold uppercase tracking-wider text-(--text-secondary) flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Measures (Metrics)
              </label>
              <div className="flex flex-wrap items-center gap-3 p-4 bg-(--bg-subtle) rounded-xl border border-(--border-subtle) min-h-16">
                {metrics.length === 0 && (
                  <Chip label="Row Count" onRemove={() => {}} /> // Visual only, default
                )}
                {metrics.map((m, idx) => (
                  <Chip
                    key={idx}
                    label={m.field ? `${m.op}(${m.field})` : "Count"}
                    onRemove={() => setMetrics(metrics.filter((_, i) => i !== idx))}
                  />
                ))}
                <Popover
                  isOpen={openPopover === "metric"}
                  onClose={() => setOpenPopover(null)}
                  trigger={
                    <button
                      onClick={() => setOpenPopover("metric")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-(--surface-elevated) hover:bg-(--bg-hover) text-(--accent) transition-all border border-(--border)"
                    >
                      <Plus className="w-4 h-4" />
                      Add Measure
                    </button>
                  }
                >
                  <div className="w-64 divide-y divide-(--border-subtle)">
                    {!metrics.some((m) => m.op === "count") && (
                      <button
                        className="w-full text-left px-4 py-2.5 text-base hover:bg-(--bg-hover) text-(--text-primary)"
                        onClick={() => addMetric("count")}
                      >
                        Row Count
                      </button>
                    )}
                    <div className="px-4 py-2.5 text-xs font-bold text-(--muted) uppercase tracking-widest bg-(--surface)">
                      Sum
                    </div>
                    {numericColumns
                      .filter((col) => !metrics.some((m) => m.op === "sum" && m.field === col))
                      .map((col) => (
                        <button
                          key={`sum-${col}`}
                          className="w-full text-left px-4 py-2.5 text-base hover:bg-(--bg-hover) text-(--text-primary)"
                          onClick={() => addMetric("sum", col)}
                        >
                          Sum of {col}
                        </button>
                      ))}
                    <div className="px-4 py-2.5 text-xs font-bold text-(--muted) uppercase tracking-widest bg-(--surface)">
                      Average
                    </div>
                    {numericColumns
                      .filter((col) => !metrics.some((m) => m.op === "avg" && m.field === col))
                      .map((col) => (
                        <button
                          key={`avg-${col}`}
                          className="w-full text-left px-4 py-2.5 text-base hover:bg-(--bg-hover) text-(--text-primary)"
                          onClick={() => addMetric("avg", col)}
                        >
                          Average of {col}
                        </button>
                      ))}
                  </div>
                </Popover>
              </div>
            </div>

            {/* Filters Section */}
            <div className="space-y-4">
              <label className="text-sm font-semibold uppercase tracking-wider text-(--text-secondary) flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </label>
              <div className="flex flex-wrap items-center gap-3 p-4 bg-(--bg-subtle) rounded-xl border border-(--border-subtle) min-h-16">
                {filters.map((f, idx) => (
                  <Chip
                    key={idx}
                    label={`${f.field} ${f.op === "eq" ? "=" : "≈"} ${f.value}`}
                    onRemove={() => setFilters(filters.filter((_, i) => i !== idx))}
                  />
                ))}
                <Popover
                  isOpen={openPopover === "filter"}
                  onClose={() => setOpenPopover(null)}
                  trigger={
                    <button
                      onClick={() => setOpenPopover("filter")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-(--surface-elevated) hover:bg-(--bg-hover) text-(--accent) transition-all border border-(--border)"
                    >
                      <Plus className="w-4 h-4" />
                      Add Filter
                    </button>
                  }
                >
                  <div className="p-4 w-72 space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-(--muted) uppercase tracking-widest">
                        Column
                      </label>
                      <select
                        className="w-full bg-(--background) border border-(--border) rounded-lg px-3 py-2 text-base outline-none focus:ring-2 focus:ring-(--accent)"
                        value={newFilterField}
                        onChange={(e) => setNewFilterField(e.target.value)}
                      >
                        <option value="">Select Field</option>
                        {uploadResult.columns.map((col) => (
                          <option key={col} value={col}>
                            {col}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-(--muted) uppercase tracking-widest">
                        Condition
                      </label>
                      <select
                        className="w-full bg-(--background) border border-(--border) rounded-lg px-3 py-2 text-base outline-none focus:ring-2 focus:ring-(--accent)"
                        value={newFilterOp}
                        onChange={(e) => setNewFilterOp(e.target.value as "eq" | "contains")}
                      >
                        <option value="eq">Equals</option>
                        <option value="contains">Contains</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-(--muted) uppercase tracking-widest">
                        Value
                      </label>
                      <input
                        type="text"
                        className="w-full bg-(--background) border border-(--border) rounded-lg px-3 py-2 text-base outline-none focus:ring-2 focus:ring-(--accent)"
                        placeholder="Type value..."
                        value={newFilterValue}
                        onChange={(e) => setNewFilterValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addFilter()}
                      />
                    </div>
                    <Button onClick={addFilter} className="w-full" size="sm">
                      Apply Filter
                    </Button>
                  </div>
                </Popover>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 pt-8 border-t border-(--border-subtle)">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <Button
                onClick={handleRun}
                isLoading={isLoading}
                className="w-full md:w-56 py-3 h-12 shadow-xl"
              >
                Generate Report
              </Button>
              <div className="text-sm text-(--text-secondary) bg-(--bg-hover) px-4 py-2 rounded-lg border border-(--border-subtle)">
                {groupBy.length > 0 ? (
                  <span className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-(--accent)" />
                    Grouping by {groupBy.join(" → ")}
                  </span>
                ) : (
                  "Grand total summary"
                )}
              </div>
            </div>

            {error && (
              <div className="p-4 bg-(--error-bg) border border-(--error-border) text-(--error) text-base rounded-xl flex items-center gap-3 animate-in shake duration-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}
          </div>
        </div>
      </Card>

      {result && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ReportResults result={result} />
        </section>
      )}
    </div>
  );
}
