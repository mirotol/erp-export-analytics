package httpapi_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"erp-export-analytics/api/internal/httpapi"
)

func TestHandleSamples(t *testing.T) {
	httpapi.DataDir = filepath.Join("..", "..", "data")
	router := httpapi.NewRouter()

	t.Run("list samples", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/samples", nil)
		rr := httptest.NewRecorder()

		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rr.Code)
		}

		var resp []httpapi.SampleFile
		if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
			t.Fatal(err)
		}

		if len(resp) != 2 {
			t.Errorf("expected 2 samples, got %d", len(resp))
		}

		if resp[0].ID != "sample-invoices" {
			t.Errorf("expected first sample to be sample-invoices, got %s", resp[0].ID)
		}
	})

	t.Run("download sample", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/samples/sample-invoices", nil)
		rr := httptest.NewRecorder()

		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rr.Code)
		}

		contentType := rr.Header().Get("Content-Type")
		if contentType != "text/csv; charset=utf-8" {
			t.Errorf("expected content type text/csv; charset=utf-8, got %s", contentType)
		}

		contentDisp := rr.Header().Get("Content-Disposition")
		if contentDisp != "attachment; filename=\"sample-invoices.csv\"" {
			t.Errorf("expected content disposition attachment; filename=\"sample-invoices.csv\", got %s", contentDisp)
		}

		if rr.Body.Len() == 0 {
			t.Error("expected non-empty body")
		}
	})

	t.Run("view sample", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/samples/sample-invoices?view", nil)
		rr := httptest.NewRecorder()

		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rr.Code)
		}

		contentType := rr.Header().Get("Content-Type")
		if contentType != "application/json; charset=utf-8" {
			t.Errorf("expected content type application/json; charset=utf-8, got %s", contentType)
		}

		var resp httpapi.UploadResponse
		if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
			t.Fatal(err)
		}

		if resp.FileName != "sample-invoices.csv" {
			t.Errorf("expected filename sample-invoices.csv, got %s", resp.FileName)
		}
		if len(resp.Columns) == 0 {
			t.Error("expected non-empty columns")
		}
		if len(resp.PreviewRows) == 0 {
			t.Error("expected non-empty preview rows")
		}
	})

	t.Run("unknown sample", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/samples/unknown", nil)
		rr := httptest.NewRecorder()

		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusNotFound {
			t.Errorf("expected status 404, got %d", rr.Code)
		}
	})
}
