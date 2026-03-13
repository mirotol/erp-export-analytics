import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ReportChart } from "./ReportChart";

// Mock ResizeObserver for Recharts
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock Recharts components
vi.mock("recharts", async (importOriginal) => {
  const original = await importOriginal<typeof import("recharts")>();

  return {
    ...original,
    ResponsiveContainer: ({ children }: React.PropsWithChildren) => (
      <div className="recharts-responsive-container">{children}</div>
    ),
    BarChart: vi.fn(({ children }: React.PropsWithChildren) => (
      <div className="mock-bar-chart">{children}</div>
    )),
    LineChart: vi.fn(({ children }: React.PropsWithChildren) => (
      <div className="mock-line-chart">{children}</div>
    )),
    Bar: vi.fn(() => <div className="mock-bar" />),
    Line: vi.fn(() => <div className="mock-line" />),
  };
});

describe("ReportChart", () => {
  const mockDimensions = ["status"];
  const mockMetrics = ["count"];
  const mockRows = [
    ["Paid", "10"],
    ["Sent", "5"],
  ];

  it("renders a bar chart for status dimension", () => {
    const { container } = render(
      <ReportChart dimensions={mockDimensions} metrics={mockMetrics} rows={mockRows} />
    );

    expect(screen.getByText(/Visualization/)).toBeInTheDocument();
    expect(screen.getByText(/Showing: count/)).toBeInTheDocument();

    expect(container.querySelector(".mock-bar-chart")).toBeTruthy();
    expect(container.querySelector(".mock-line-chart")).toBeFalsy();
  });

  it("renders a line chart for date dimension", () => {
    const dateDimensions = ["invoice_date"];
    const dateRows = [
      ["2026-01-01", "10"],
      ["2026-01-02", "15"],
    ];

    const { container } = render(
      <ReportChart dimensions={dateDimensions} metrics={mockMetrics} rows={dateRows} />
    );

    expect(container.querySelector(".mock-line-chart")).toBeTruthy();
    expect(container.querySelector(".mock-bar-chart")).toBeFalsy();
  });

  it("shows a hint when more than 3 metrics are selected", () => {
    const manyMetrics = ["count", "sum(total)", "sum(tax)", "avg(total)"];
    const manyRows = [["Paid", "10", "1000", "80", "100"]];

    render(<ReportChart dimensions={mockDimensions} metrics={manyMetrics} rows={manyRows} />);

    expect(screen.getByText(/Recommend selecting ≤ 3 metrics/)).toBeInTheDocument();
  });

  it("shows a hint and limits to 20 when more than 30 groups exist", () => {
    const manyGroupsRows = Array.from({ length: 35 }, (_, i) => [`Group ${i}`, String(i)]);

    render(<ReportChart dimensions={mockDimensions} metrics={mockMetrics} rows={manyGroupsRows} />);

    expect(screen.getByText(/Showing top 20 groups for readability/)).toBeInTheDocument();
  });

  it("renders multiple bars for multiple metrics", () => {
    const multiMetrics = ["count", "sum(total)"];
    const multiRows = [
      ["Paid", "10", "1000"],
      ["Sent", "5", "500"],
    ];

    const { container } = render(
      <ReportChart dimensions={mockDimensions} metrics={multiMetrics} rows={multiRows} />
    );

    const bars = container.querySelectorAll(".mock-bar");
    expect(bars.length).toBe(2); // One Bar component per metric
  });
});
