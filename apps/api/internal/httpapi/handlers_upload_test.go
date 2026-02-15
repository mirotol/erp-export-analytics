package httpapi_test

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"erp-export-analytics/api/internal/httpapi"
	"erp-export-analytics/api/internal/reports"
)

func TestHandleUpload(t *testing.T) {
	router := httpapi.NewRouter()

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

		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("expected status 201, got %d", rr.Code)
		}

		var resp httpapi.UploadResponse
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

		router.ServeHTTP(rr, req)

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

		router.ServeHTTP(rr, req)

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

		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("expected status 201, got %d", rr.Code)
		}

		var resp httpapi.UploadResponse
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

		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusMethodNotAllowed {
			t.Errorf("expected status 405, got %d", rr.Code)
		}
	})

	t.Run("cleanup and overridable temp dir with TTL", func(t *testing.T) {
		oldDir := httpapi.UploadTempDir
		tmpDir := t.TempDir()
		httpapi.SetUploadTempDir(tmpDir)

		// Set very short TTL for testing
		oldTTL := reports.TTL
		reports.SetTTL(0 * time.Second)
		defer func() {
			httpapi.SetUploadTempDir(oldDir)
			reports.SetTTL(oldTTL)

			// Clean up any remaining reports after test
			reports.ClearStore()
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

		router.ServeHTTP(rr, req)

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
		reports.CleanupExpiredReports()

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

		router.ServeHTTP(rr, req)

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

		router.ServeHTTP(rr, req)

		if rr.Code != http.StatusCreated {
			t.Errorf("expected status 201, got %d. Body: %s", rr.Code, rr.Body.String())
		}

		var resp httpapi.UploadResponse
		if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
			t.Fatal(err)
		}

		if len(resp.PreviewRows) != 2 {
			t.Errorf("expected 2 preview rows, got %d", len(resp.PreviewRows))
		}
	})
}
