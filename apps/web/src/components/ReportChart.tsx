import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
} from "recharts";
import type { LegendPayload } from "recharts";
import { Info } from "lucide-react";

interface ReportChartProps {
  dimensions: string[];
  metrics: string[];
  rows: string[][];
}

const getSeriesColor = (index: number) => {
  if (index === 0) return "var(--accent)";
  if (index === 1) return "color-mix(in srgb, var(--accent), white 30%)";
  if (index === 2) return "color-mix(in srgb, var(--accent), black 15%)";
  // Repeat cycle for more than 3
  if (index % 3 === 0) return "var(--accent)";
  if (index % 3 === 1) return "color-mix(in srgb, var(--accent), white 30%)";
  return "color-mix(in srgb, var(--accent), black 15%)";
};

const isDateLike = (dimName: string) => {
  if (!dimName) return false;
  const name = dimName.toLowerCase();
  return (
    name.includes("date") ||
    name.includes("time") ||
    name.includes("day") ||
    name.includes("month") ||
    name.includes("year") ||
    name.includes("created_at") ||
    name.includes("updated_at")
  );
};

export function ReportChart({ dimensions, metrics, rows }: ReportChartProps) {
  const [hiddenMetrics, setHiddenMetrics] = useState<Set<string>>(new Set());

  const isTimeSeries = useMemo(() => {
    return dimensions.length > 0 && isDateLike(dimensions[0]);
  }, [dimensions]);

  const chartData = useMemo(() => {
    if (metrics.length === 0 || rows.length === 0) return [];

    const dimCount = dimensions.length;
    // first metric is at index dimCount in each row
    const firstMetricIdx = dimCount;

    // Sort: if time series, sort by first dimension. Otherwise sort by first metric desc.
    const sorted = [...rows].sort((a, b) => {
      if (isTimeSeries) {
        const valA = a[0] || "";
        const valB = b[0] || "";
        return valA < valB ? -1 : valA > valB ? 1 : 0;
      }
      const valA = parseFloat(a[firstMetricIdx]) || 0;
      const valB = parseFloat(b[firstMetricIdx]) || 0;
      return valB - valA;
    });

    const shouldLimit = !isTimeSeries && sorted.length > 30;
    const displayRows = shouldLimit ? sorted.slice(0, 20) : sorted;

    return displayRows.map((row) => {
      const name = row.slice(0, dimCount).join(" / ") || "Total";
      const entry: Record<string, string | number> = { name };
      metrics.forEach((metric, i) => {
        entry[metric] = parseFloat(row[dimCount + i]) || 0;
      });
      return entry;
    });
  }, [rows, dimensions, metrics, isTimeSeries]);

  const handleLegendClick = (o: LegendPayload) => {
    const { dataKey } = o;
    if (typeof dataKey !== "string") return;

    setHiddenMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) next.delete(dataKey);
      else next.add(dataKey);
      return next;
    });
  };

  if (dimensions.length === 0 || metrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-(--surface) border border-(--border) rounded-xl">
        <h3 className="text-lg font-medium text-(--text-primary)">Cannot render chart</h3>
        <p className="text-(--text-secondary) mt-2 max-w-md">
          Charts require at least one "Group by" column and one numeric metric (Count or Sum).
        </p>
      </div>
    );
  }

  const isTooManyMetrics = metrics.length > 3;
  const isTooManyGroups = !isTimeSeries && rows.length > 30;

  return (
    <div className="flex flex-col bg-(--surface) border border-(--border) rounded-xl overflow-hidden shadow-(--shadow-subtle)">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-(--border) bg-(--bg-subtle) gap-4">
        <div>
          <h4 className="text-base font-semibold text-(--text-primary)">Visualization</h4>
          <p className="text-sm text-(--text-secondary) mt-0.5">Showing: {metrics.join(", ")}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {isTooManyMetrics && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-(--warning-muted) px-2.5 py-1 bg-(--bg-hover) rounded-md border border-(--border-subtle)">
              <Info className="w-5 h-5" />
              <span>Recommend selecting ≤ 3 metrics for readability</span>
            </div>
          )}
          {isTooManyGroups && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-(--text-secondary) px-2.5 py-1 bg-(--bg-hover) rounded-md border border-(--border-subtle)">
              <Info className="w-5 h-5 text-(--accent)" />
              <span>Showing top 20 groups for readability</span>
            </div>
          )}
        </div>
      </div>

      <div className="h-96 w-full p-6 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {isTimeSeries ? (
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-active)" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="var(--muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="var(--muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString()
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                }}
              />
              <Legend
                onClick={handleLegendClick}
                wrapperStyle={{ paddingTop: "10px", cursor: "pointer" }}
                align="right"
                verticalAlign="top"
                iconType="circle"
              />
              {metrics.map((metric, i) => (
                <Line
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stroke={getSeriesColor(i)}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: getSeriesColor(i), strokeWidth: 2, stroke: "var(--surface)" }}
                  activeDot={{ r: 6 }}
                  hide={hiddenMetrics.has(metric)}
                  animationDuration={500}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-active)" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="var(--muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="var(--muted)"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString()
                }
              />
              <Tooltip
                cursor={{ fill: "var(--surface-elevated)" }}
                contentStyle={{
                  backgroundColor: "var(--surface-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                }}
              />
              <Legend
                onClick={handleLegendClick}
                wrapperStyle={{ paddingTop: "10px", cursor: "pointer" }}
                align="right"
                verticalAlign="top"
                iconType="rect"
              />
              {metrics.map((metric, i) => (
                <Bar
                  key={metric}
                  dataKey={metric}
                  fill={getSeriesColor(i)}
                  radius={[4, 4, 0, 0]}
                  hide={hiddenMetrics.has(metric)}
                  animationDuration={500}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
