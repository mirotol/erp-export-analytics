import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "./App";

describe("App Happy Path", () => {
  const mockSamples = [
    { id: "sample-1", fileName: "sample-invoices.csv", title: "Invoices (ERP export)", rows: 1 },
  ];

  const mockPreview = {
    reportId: "sample-1",
    fileName: "sample-invoices.csv",
    columns: ["id", "name", "total"],
    previewRows: [["1", "Test", "100"]],
    size: 1024,
  };

  const mockReportResult = {
    columns: ["name", "count", "sum(total)"],
    rows: [["Test", "1", "100.00"]],
    rowsScanned: 1,
  };

  function inputToUrl(input: RequestInfo | URL): string {
    if (typeof input === "string") return input;
    if (input instanceof URL) return input.toString();
    // At this point, it's Request (the other part of RequestInfo)
    return input.url;
  }

  beforeEach(() => {
    vi.restoreAllMocks();

    type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

    const fetchMock = vi.fn<FetchFn>();

    fetchMock.mockImplementation(async (input): Promise<Response> => {
      const url = inputToUrl(input);
      const path = url.replace(/^https?:\/\/[^/]+/, "");

      const resp = (r: Pick<Response, "ok" | "status" | "json" | "text">) =>
        r as unknown as Response;

      if (path.startsWith("/api/samples") && !path.includes("/api/samples/")) {
        return resp({ ok: true, status: 200, json: async () => mockSamples, text: async () => "" });
      }

      if (path.startsWith("/api/samples/sample-1")) {
        return resp({ ok: true, status: 200, json: async () => mockPreview, text: async () => "" });
      }

      if (path.includes("/run")) {
        return resp({
          ok: true,
          status: 200,
          json: async () => mockReportResult,
          text: async () => "",
        });
      }

      return resp({
        ok: false,
        status: 404,
        json: async () => ({}),
        text: async () => "Not found",
      });
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  it("renders page, loads samples, and can run a report", async () => {
    render(<App />);

    expect(screen.getByText(/ERP Export Analytics/i)).toBeInTheDocument();

    const invoicesBtn = await screen.findByRole("button", { name: /Invoices/i });
    fireEvent.click(invoicesBtn);

    expect(await screen.findByText(/Report Preview/i)).toBeInTheDocument();
    expect(await screen.findByText(/Build Report/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Run Report/i }));

    expect(await screen.findByText(/Report Results/i)).toBeInTheDocument();

    // Table content from mocked report result
    expect(await screen.findAllByText("sum(total)")).toHaveLength(2); // One in dropdown, one in table header
    expect(screen.getByText("100.00")).toBeInTheDocument();

    // Switch to chart
    const chartToggle = screen.getByRole("button", { name: /Chart/i });
    fireEvent.click(chartToggle);

    await waitFor(() => {
      const svg = document.querySelector(".recharts-wrapper svg");
      const container = document.querySelector(".recharts-responsive-container");
      expect(svg || container).toBeTruthy();
    });

    // Switch back to table
    const tableToggle = screen.getByRole("button", { name: /Table/i });
    fireEvent.click(tableToggle);

    // Table content visible again
    expect(await screen.findAllByText("sum(total)")).toHaveLength(2);
    expect(screen.getByText("100.00")).toBeInTheDocument();
  });
});
