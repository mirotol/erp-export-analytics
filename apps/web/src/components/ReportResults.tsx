import { useState, useMemo } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  SearchX,
  Table as TableIcon,
  BarChart3,
} from "lucide-react";
import type { ReportResult } from "../lib/api";
import { ReportChart } from "./ReportChart";

interface ReportResultsProps {
  result: ReportResult;
}

type SortConfig = {
  key: number;
  direction: "asc" | "desc";
};

function SortIcon({ active, direction }: { active: boolean; direction?: "asc" | "desc" }) {
  return (
    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
      {!active ? (
        <ChevronsUpDown className="w-6 h-6 text-muted-foreground/70 opacity-60 group-hover:opacity-100 transition-opacity" />
      ) : (
        <span className="flex flex-col -space-y-2.5">
          <ChevronUp
            className={`w-5 h-5 ${direction === "asc" ? "text-accent" : "text-muted-foreground/60"}`}
          />
          <ChevronDown
            className={`w-5 h-5 ${direction === "desc" ? "text-accent" : "text-muted-foreground/60"}`}
          />
        </span>
      )}
    </div>
  );
}

export function ReportResults({ result }: ReportResultsProps) {
  const [view, setView] = useState<"table" | "chart">("table");
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(() => {
    // Default sorting:
    // If sum metric exists -> sort descending by sum
    // Else -> sort descending by count

    // Sum columns usually look like "sum(column)"
    const sumIdx = result.columns.findIndex((c) => c.startsWith("sum("));
    if (sumIdx !== -1) return { key: sumIdx, direction: "desc" };

    const countIdx = result.columns.findIndex((c) => c === "count");
    if (countIdx !== -1) return { key: countIdx, direction: "desc" };

    return null;
  });

  const sortedRows = useMemo(() => {
    if (!sortConfig) return result.rows;

    return [...result.rows].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      // Try to compare as numbers
      const aNum = parseFloat(aVal);
      const bNum = parseFloat(bVal);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
      }

      // Fallback to string comparison
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [result.rows, sortConfig]);

  const handleSort = (index: number) => {
    setSortConfig((prev) => {
      if (prev?.key === index) {
        return { key: index, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key: index, direction: "desc" };
    });
  };

  if (result.rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 bg-surface-hover rounded-full flex items-center justify-center mb-4">
          <SearchX className="w-8 h-8 text-muted" />
        </div>
        <h3 className="text-lg font-medium">No results found</h3>
        <p className="text-muted-foreground mt-1">No results match your filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Report Results</h3>
        <div className="flex items-center gap-6">
          <div className="flex items-center bg-surface border border-border rounded-lg p-1">
            <button
              onClick={() => setView("table")}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-all ${
                view === "table"
                  ? "bg-surface-hover text-accent shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableIcon className="w-4 h-4" />
              Table
            </button>
            <button
              onClick={() => setView("chart")}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium transition-all ${
                view === "chart"
                  ? "bg-surface-hover text-accent shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Chart
            </button>
          </div>

          <div className="text-base text-muted-foreground flex gap-4">
            <span>{result.rows.length} groups</span>
            <span>{result.rowsScanned.toLocaleString()} rows scanned</span>
          </div>
        </div>
      </div>

      {view === "table" ? (
        <div className="border border-border rounded-xl overflow-hidden bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface-hover z-10 border-b border-border">
                <tr>
                  {result.columns.map((col, i) => (
                    <th
                      key={i}
                      className="px-4 py-3 text-base font-semibold cursor-pointer hover:bg-border transition-colors group whitespace-nowrap"
                      onClick={() => handleSort(i)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col}</span>
                        <SortIcon
                          active={sortConfig?.key === i}
                          direction={sortConfig?.direction}
                        />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/50 hover:bg-surface-hover/50 transition-colors"
                  >
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        className="px-4 py-3 text-base text-muted-foreground whitespace-nowrap"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <ReportChart result={result} />
      )}
    </div>
  );
}
