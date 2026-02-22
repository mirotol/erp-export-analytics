import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ReportResult } from "../lib/api";

export function ReportChart({
  result,
  selectedMetricIdx,
  setSelectedMetricIdx,
  numericColumnIndices,
}: {
  result: ReportResult;
  selectedMetricIdx: number;
  setSelectedMetricIdx: (idx: number) => void;
  numericColumnIndices: number[];
}) {
  const dimensionIndices = useMemo(() => {
    return result.columns
      .map((col, idx) => {
        const isMetric = col === "count" || col.startsWith("sum(") || col.startsWith("avg(");
        return isMetric ? -1 : idx;
      })
      .filter((idx) => idx !== -1);
  }, [result.columns]);

  // 3. Prepare data
  const chartData = useMemo(() => {
    if (selectedMetricIdx === -1 || result.rows.length === 0) return [];

    // Sort all rows by selected metric descending
    const sorted = [...result.rows].sort((a, b) => {
      const valA = parseFloat(a[selectedMetricIdx]) || 0;
      const valB = parseFloat(b[selectedMetricIdx]) || 0;
      return valB - valA;
    });

    const top12 = sorted.slice(0, 12);
    const others = sorted.slice(12);

    const data = top12.map((row) => ({
      name: dimensionIndices.map((idx) => row[idx]).join(" / ") || "Total",
      value: parseFloat(row[selectedMetricIdx]) || 0,
    }));

    if (others.length > 0) {
      const othersValue = others.reduce(
        (acc, row) => acc + (parseFloat(row[selectedMetricIdx]) || 0),
        0
      );
      data.push({
        name: "Other",
        value: othersValue,
      });
    }

    return data;
  }, [result.rows, selectedMetricIdx, dimensionIndices]);

  // 4. Determine if we should use horizontal layout
  const isHorizontal = useMemo(() => {
    return chartData.some((item) => item.name.length > 14);
  }, [chartData]);

  // 5. Label formatting
  const formatLabel = (label: string) => {
    if (isHorizontal && label.length > 20) {
      return label.substring(0, 20) + "...";
    }
    return label;
  };

  const formatTooltipLabel = (label: React.ReactNode): React.ReactNode => {
    return typeof label === "string" && label.length > 30 ? `${label.slice(0, 30)}...` : label;
  };

  // 6. Validate if chart can be shown
  const canShowChart = result.columns.length > 1 && numericColumnIndices.length > 0;

  if (!canShowChart) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-(--surface) border border-(--border) rounded-xl">
        <h3 className="text-lg font-medium text-(--text-primary)">Cannot render chart</h3>
        <p className="text-(--text-secondary) mt-2 max-w-md">
          Charts require at least one "Group by" column and one numeric metric (Count or Sum).
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-(--surface) border border-(--border) rounded-xl overflow-hidden shadow-(--shadow-subtle)">
      {/* Chart Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-(--border) bg-(--bg-subtle)">
        <h4 className="text-base font-semibold text-(--text-primary)">Visualization</h4>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-(--text-secondary)">Metric</label>
          <select
            className="bg-(--surface-elevated) border border-(--border) rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-(--accent) outline-none transition-all cursor-pointer hover:border-(--accent) text-(--text-primary)"
            value={selectedMetricIdx}
            onChange={(e) => setSelectedMetricIdx(parseInt(e.target.value))}
          >
            {numericColumnIndices.map((idx) => (
              <option key={idx} value={idx}>
                {result.columns[idx]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart Body */}
      <div className="h-96 w-full p-6 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout={isHorizontal ? "vertical" : "horizontal"}
            margin={{
              top: 10,
              right: 30,
              left: isHorizontal ? 40 : 0,
              bottom: isHorizontal ? 0 : 20,
            }}
          >
            <defs>
              <linearGradient
                id="barGradient"
                x1="0"
                y1="0"
                x2={isHorizontal ? "1" : "0"}
                y2={isHorizontal ? "0" : "1"}
              >
                <stop offset="0%" stopColor="var(--accent-hover)" stopOpacity={1} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--bg-active)"
              vertical={isHorizontal}
              horizontal={!isHorizontal}
            />
            {isHorizontal ? (
              <>
                <XAxis
                  type="number"
                  stroke="var(--muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString()
                  }
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="var(--muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={isHorizontal ? 100 : 60}
                  tickFormatter={formatLabel}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="name"
                  stroke="var(--muted)"
                  fontSize={16}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="var(--muted)"
                  fontSize={16}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) =>
                    value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString()
                  }
                />
              </>
            )}
            <Tooltip
              cursor={{ fill: "var(--surface-elevated)" }}
              labelFormatter={formatTooltipLabel}
              contentStyle={{
                backgroundColor: "var(--surface-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text-primary)",
              }}
              itemStyle={{ color: "var(--accent-hover)" }}
            />
            <Bar dataKey="value" radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill="url(#barGradient)"
                  className="hover:fill-(--accent-hover) transition-colors duration-200"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
