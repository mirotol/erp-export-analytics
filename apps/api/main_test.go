package main

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"
)

func TestHandleUpload(t *testing.T) {
	t.Run("successful upload", func(t *testing.T) {
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)
		part, err := writer.CreateFormFile("file", "test.csv")
		if err != nil {
			t.Fatal(err)
		}
		part.Write([]byte("id,name\n1,test"))
		writer.Close()

		req := httptest.NewRequest(http.MethodPost, "/api/upload", body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		rr := httptest.NewRecorder()

		handleUpload(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("expected status 201, got %d", rr.Code)
		}

		var resp UploadResponse
		if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
			t.Fatal(err)
		}

		if resp.ReportID == "" {
			t.Error("expected reportId to be non-empty")
		}
		if resp.FileName != "test.csv" {
			t.Errorf("expected fileName test.csv, got %s", resp.FileName)
		}
		if resp.Size == 0 {
			t.Error("expected size to be non-zero")
		}

		if len(resp.Columns) != 2 || resp.Columns[0] != "id" || resp.Columns[1] != "name" {
			t.Errorf("expected columns [id name], got %v", resp.Columns)
		}
		if len(resp.PreviewRows) != 1 || resp.PreviewRows[0][0] != "1" || resp.PreviewRows[0][1] != "test" {
			t.Errorf("expected previewRows [[1 test]], got %v", resp.PreviewRows)
		}
	})

	t.Run("invalid extension", func(t *testing.T) {
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)
		part, err := writer.CreateFormFile("file", "test.txt")
		if err != nil {
			t.Fatal(err)
		}
		part.Write([]byte("some text"))
		writer.Close()

		req := httptest.NewRequest(http.MethodPost, "/api/upload", body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		rr := httptest.NewRecorder()

		handleUpload(rr, req)

		if rr.Code != http.StatusUnsupportedMediaType {
			t.Errorf("expected status 415, got %d", rr.Code)
		}
	})

	t.Run("missing file", func(t *testing.T) {
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)
		writer.Close()

		req := httptest.NewRequest(http.MethodPost, "/api/upload", body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		rr := httptest.NewRecorder()

		handleUpload(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Errorf("expected status 400, got %d", rr.Code)
		}
	})

	t.Run("successful upload with path in filename", func(t *testing.T) {
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)
		// Simulating a filename with path, some clients might send this
		part, err := writer.CreateFormFile("file", "../../etc/passwd.csv")
		if err != nil {
			t.Fatal(err)
		}
		part.Write([]byte("id,name\n1,test"))
		writer.Close()

		req := httptest.NewRequest(http.MethodPost, "/api/upload", body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		rr := httptest.NewRecorder()

		handleUpload(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("expected status 201, got %d", rr.Code)
		}

		var resp UploadResponse
		if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
			t.Fatal(err)
		}

		if resp.FileName != "passwd.csv" {
			t.Errorf("expected sanitized fileName passwd.csv, got %s", resp.FileName)
		}

		if len(resp.Columns) != 2 || resp.Columns[0] != "id" || resp.Columns[1] != "name" {
			t.Errorf("expected columns [id name], got %v", resp.Columns)
		}
		if len(resp.PreviewRows) != 1 || resp.PreviewRows[0][0] != "1" || resp.PreviewRows[0][1] != "test" {
			t.Errorf("expected previewRows [[1 test]], got %v", resp.PreviewRows)
		}
	})

	t.Run("wrong method", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/upload", nil)
		rr := httptest.NewRecorder()

		handleUpload(rr, req)

		if rr.Code != http.StatusMethodNotAllowed {
			t.Errorf("expected status 405, got %d", rr.Code)
		}
	})

	t.Run("cleanup and overridable temp dir with TTL", func(t *testing.T) {
		oldDir := uploadTempDir
		tmpDir := t.TempDir()
		uploadTempDir = tmpDir

		// Set very short TTL for testing
		oldTTL := reportTTL
		reportTTL = 0 * time.Second
		defer func() {
			uploadTempDir = oldDir
			reportTTL = oldTTL

			// Clean up any remaining reports after test
			reportsMu.Lock()
			reports = make(map[string]Report)
			reportsMu.Unlock()
		}()

		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)
		part, err := writer.CreateFormFile("file", "test.csv")
		if err != nil {
			t.Fatal(err)
		}
		part.Write([]byte("id,name\n1,test"))
		writer.Close()

		req := httptest.NewRequest(http.MethodPost, "/api/upload", body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		rr := httptest.NewRecorder()

		handleUpload(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("expected status 201, got %d", rr.Code)
		}

		// Check if the file exists (it should because it's not deleted immediately)
		entries, err := os.ReadDir(tmpDir)
		if err != nil {
			t.Fatal(err)
		}
		if len(entries) != 1 {
			t.Errorf("expected temp directory to have 1 file, but found %d files", len(entries))
		}

		// Run manual cleanup
		cleanupExpiredReports()

		// Check if the directory is empty after manual cleanup
		entries, err = os.ReadDir(tmpDir)
		if err != nil {
			t.Fatal(err)
		}
		if len(entries) != 0 {
			t.Errorf("expected temp directory to be empty after cleanup, but found %d files", len(entries))
		}
	})

	t.Run("empty csv", func(t *testing.T) {
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)
		_, err := writer.CreateFormFile("file", "empty.csv")
		if err != nil {
			t.Fatal(err)
		}
		// Write nothing
		writer.Close()

		req := httptest.NewRequest(http.MethodPost, "/api/upload", body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		rr := httptest.NewRecorder()

		handleUpload(rr, req)

		if rr.Code != http.StatusBadRequest {
			t.Errorf("expected status 400 for empty csv, got %d", rr.Code)
		}
	})

	t.Run("variable length rows", func(t *testing.T) {
		body := &bytes.Buffer{}
		writer := multipart.NewWriter(body)
		part, err := writer.CreateFormFile("file", "variable.csv")
		if err != nil {
			t.Fatal(err)
		}
		part.Write([]byte("id,name,extra\n1,test\n2,test2,more"))
		writer.Close()

		req := httptest.NewRequest(http.MethodPost, "/api/upload", body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		rr := httptest.NewRecorder()

		handleUpload(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("expected status 201, got %d. Body: %s", rr.Code, rr.Body.String())
		}

		var resp UploadResponse
		if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
			t.Fatal(err)
		}

		if len(resp.PreviewRows) != 2 {
			t.Errorf("expected 2 preview rows, got %d", len(resp.PreviewRows))
		}
	})
}

func TestHandleHealth(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()

	handleHealth(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rr.Code)
	}

	var resp map[string]any
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}

	if resp["status"] != "ok" {
		t.Errorf("expected status ok, got %v", resp["status"])
	}
	if resp["time"] == nil {
		t.Error("expected time to be present")
	}
}

func TestHandleSamples(t *testing.T) {
	t.Run("list samples", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/samples", nil)
		rr := httptest.NewRecorder()

		handleGetSamples(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rr.Code)
		}

		var resp []SampleFile
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

		handleDownloadSample(rr, req)

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

		handleDownloadSample(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d", rr.Code)
		}

		contentType := rr.Header().Get("Content-Type")
		if contentType != "application/json; charset=utf-8" {
			t.Errorf("expected content type application/json; charset=utf-8, got %s", contentType)
		}

		var resp UploadResponse
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

		handleDownloadSample(rr, req)

		if rr.Code != http.StatusNotFound {
			t.Errorf("expected status 404, got %d", rr.Code)
		}
	})
}

func TestHandleRunReport(t *testing.T) {
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

		handleRunReport(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("expected status 200, got %d. Body: %s", rr.Code, rr.Body.String())
		}

		var resp ReportResponse
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

		handleRunReport(rr, req)

		if rr.Code != http.StatusNotFound {
			t.Errorf("expected status 404, got %d", rr.Code)
		}
	})
}
