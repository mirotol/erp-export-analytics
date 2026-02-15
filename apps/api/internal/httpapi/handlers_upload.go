package httpapi

import (
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"erp-export-analytics/api/internal/csvutil"
	"erp-export-analytics/api/internal/reports"
	"github.com/google/uuid"
)

const maxUploadBytes = 10 << 20 // 10MB

var UploadTempDir = os.TempDir()

func SetUploadTempDir(dir string) {
	UploadTempDir = dir
}

func handleUpload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Limit upload size
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes)
	err := r.ParseMultipartForm(maxUploadBytes)
	if err != nil {
		http.Error(w, "file too large or invalid multipart form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "failed to get file from form-data", http.StatusBadRequest)
		return
	}
	defer func() {
		if err := file.Close(); err != nil {
			log.Printf("error closing upload file: %v", err)
		}
	}()

	// Sanitize filename and check file extension
	filename := filepath.Base(header.Filename)
	ext := strings.ToLower(filepath.Ext(filename))
	if ext != ".csv" {
		http.Error(w, "only .csv files are allowed", http.StatusUnsupportedMediaType)
		return
	}

	reportID := uuid.NewString()
	tempFileName := fmt.Sprintf("%s-%s", reportID, filename)
	tempFilePath := filepath.Join(UploadTempDir, tempFileName)

	dst, err := os.Create(tempFilePath)
	if err != nil {
		http.Error(w, "failed to create temporary file", http.StatusInternalServerError)
		return
	}
	defer func() {
		if err := dst.Close(); err != nil {
			log.Printf("error closing temporary file: %v", err)
		}
	}()

	size, err := io.Copy(dst, file)
	if err != nil {
		http.Error(w, "failed to save file", http.StatusInternalServerError)
		return
	}

	if err := dst.Sync(); err != nil {
		http.Error(w, "failed to sync file", http.StatusInternalServerError)
		return
	}

	// Register report for future use and cleanup
	reports.SaveReport(reports.Report{
		ID:        reportID,
		FilePath:  tempFilePath,
		CreatedAt: time.Now(),
	})

	// Open the saved temp file for CSV parsing
	f, err := os.Open(tempFilePath)
	if err != nil {
		http.Error(w, "failed to open temporary file for reading", http.StatusInternalServerError)
		return
	}
	defer f.Close()

	headers, previewRows, err := csvutil.ParseCSV(f)
	if err == io.EOF {
		http.Error(w, "csv file is empty", http.StatusBadRequest)
		return
	}
	if err != nil {
		http.Error(w, "failed to parse csv", http.StatusBadRequest)
		return
	}

	writeJSON(w, http.StatusCreated, UploadResponse{
		ReportID:    reportID,
		FileName:    filename,
		Size:        size,
		Columns:     headers,
		PreviewRows: previewRows,
	})
}
