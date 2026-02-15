package httpapi_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"erp-export-analytics/api/internal/engine"
	"erp-export-analytics/api/internal/httpapi"
)

func TestHandleRunReport(t *testing.T) {
	httpapi.DataDir = filepath.Join("..", "..", "data")
	router := httpapi.NewRouter()

	t.Run("run report on sample", func(t *testing.T) {
		reqBody := map[string]any{
			"groupBy": []string{"status"},
			"metrics": []map[string]any{
				{"op": "count"},
				{"op": "sum", "field": "total"},
			},
			"filters": []map[string]any{
				{"field": "currency", "op": "eq", "value": "USD"},
			},
			"limit": 5,
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/reports/sample-sample-invoices/run", bytes.NewReader(body))
		rr := httptest.NewRecorder()

		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d. Body: %s", rr.Code, rr.Body.String())
		}

		var resp engine.ReportResponse
		if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
			t.Fatal(err)
		}

		if len(resp.Columns) != 3 {
			t.Errorf("expected 3 columns, got %d: %v", len(resp.Columns), resp.Columns)
		}
		if len(resp.Rows) == 0 {
			t.Error("expected non-empty rows")
		}
	})

	t.Run("report not found", func(t *testing.T) {
		reqBody := map[string]any{
			"groupBy": []string{},
			"metrics": []map[string]any{{"op": "count"}},
		}
		body, _ := json.Marshal(reqBody)
		req := httptest.NewRequest(http.MethodPost, "/api/reports/non-existent/run", bytes.NewReader(body))
		rr := httptest.NewRecorder()

		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusNotFound {
			t.Errorf("expected status 404, got %d", rr.Code)
		}
	})
}
