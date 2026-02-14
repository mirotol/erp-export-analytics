package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

const maxUploadBytes = 10 << 20 // 10MB
var uploadTempDir = os.TempDir()

var reportTTL = 1 * time.Hour

type Report struct {
	ID        string
	FilePath  string
	CreatedAt time.Time
}

var (
	reports   = make(map[string]Report)
	reportsMu sync.RWMutex
)

type UploadResponse struct {
	ReportID    string     `json:"reportId"`
	FileName    string     `json:"fileName"`
	Size        int64      `json:"size"`
	Columns     []string   `json:"columns"`
	PreviewRows [][]string `json:"previewRows"`
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("Error encoding JSON: %v", err)
	}
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status": "ok",
		"time":   time.Now().UTC().Format(time.RFC3339),
	})
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
	tempFilePath := filepath.Join(uploadTempDir, tempFileName)

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
	reportsMu.Lock()
	reports[reportID] = Report{
		ID:        reportID,
		FilePath:  tempFilePath,
		CreatedAt: time.Now(),
	}
	reportsMu.Unlock()

	// Open the saved temp file for CSV parsing
	f, err := os.Open(tempFilePath)
	if err != nil {
		http.Error(w, "failed to open temporary file for reading", http.StatusInternalServerError)
		return
	}
	defer func() {
		if err := f.Close(); err != nil {
			log.Printf("error closing file for reading: %v", err)
		}
	}()

	csvReader := csv.NewReader(f)
	csvReader.FieldsPerRecord = -1

	// Read headers
	headers, err := csvReader.Read()
	if err == io.EOF {
		http.Error(w, "csv file is empty", http.StatusBadRequest)
		return
	}
	if err != nil {
		http.Error(w, "failed to read csv headers", http.StatusBadRequest)
		return
	}

	var previewRows [][]string
	for i := 0; i < 50; i++ {
		row, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			http.Error(w, "failed to read csv rows", http.StatusBadRequest)
			return
		}
		previewRows = append(previewRows, row)
	}

	writeJSON(w, http.StatusCreated, UploadResponse{
		ReportID:    reportID,
		FileName:    filename,
		Size:        size,
		Columns:     headers,
		PreviewRows: previewRows,
	})
}

func startCleanupWorker() {
	ticker := time.NewTicker(10 * time.Minute)
	go func() {
		cleanupExpiredReports() // run immediately once
		for range ticker.C {
			cleanupExpiredReports()
		}
	}()
}

func cleanupExpiredReports() {
	reportsMu.Lock()
	defer reportsMu.Unlock()

	now := time.Now()
	for id, report := range reports {
		if now.Sub(report.CreatedAt) > reportTTL {
			log.Printf("cleaning up expired report: %s (path: %s)", id, report.FilePath)
			if err := os.Remove(report.FilePath); err != nil && !os.IsNotExist(err) {
				log.Printf("error removing expired report file %s: %v", report.FilePath, err)
			}
			delete(reports, id)
		}
	}
}

func main() {
	startCleanupWorker()

	mux := http.NewServeMux()

	mux.HandleFunc("/api/upload", handleUpload)
	mux.HandleFunc("/health", handleHealth)

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		http.NotFound(w, r)
	})

	addr := ":8080"
	log.Printf("API listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}
