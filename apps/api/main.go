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

type SampleFile struct {
	ID       string `json:"id"`
	FileName string `json:"fileName"`
	Title    string `json:"title"`
	Rows     int    `json:"rows"`
}

var sampleFiles = map[string]SampleFile{
	"sample-invoices": {
		ID:       "sample-invoices",
		FileName: "sample-invoices.csv",
		Title:    "Invoices (ERP export)",
		Rows:     50,
	},
	"sample-payments": {
		ID:       "sample-payments",
		FileName: "sample-payments.csv",
		Title:    "Payments (ERP export)",
		Rows:     80,
	},
}

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

func parseCSV(reader io.Reader) ([]string, [][]string, error) {
	csvReader := csv.NewReader(reader)
	csvReader.FieldsPerRecord = -1

	// Read headers
	headers, err := csvReader.Read()
	if err != nil {
		return nil, nil, err
	}

	var previewRows [][]string
	for i := 0; i < 50; i++ {
		row, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, nil, err
		}
		previewRows = append(previewRows, row)
	}

	return headers, previewRows, nil
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
	defer f.Close()

	headers, previewRows, err := parseCSV(f)
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

func handleGetSamples(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	samples := make([]SampleFile, 0, len(sampleFiles))
	// Keep order consistent for tests if needed, but a simple list is fine
	// For predictability, we can use the order they are defined or sort them
	ids := []string{"sample-invoices", "sample-payments"}
	for _, id := range ids {
		if s, ok := sampleFiles[id]; ok {
			samples = append(samples, s)
		}
	}

	writeJSON(w, http.StatusOK, samples)
}

func handleDownloadSample(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/api/samples/")
	if id == "" {
		http.Error(w, "missing sample id", http.StatusBadRequest)
		return
	}

	// Check if this is a "view" request via query param
	isView := r.URL.Query().Has("view")

	sample, ok := sampleFiles[id]
	if !ok {
		http.Error(w, "sample not found", http.StatusNotFound)
		return
	}

	path := filepath.Join("data", "samples", sample.FileName)
	f, err := os.Open(path)
	if err != nil {
		log.Printf("error opening sample file %s: %v", path, err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	defer f.Close()

	if isView {
		headers, previewRows, err := parseCSV(f)
		if err != nil {
			http.Error(w, "failed to parse sample csv", http.StatusInternalServerError)
			return
		}

		info, _ := f.Stat()
		writeJSON(w, http.StatusOK, UploadResponse{
			ReportID:    fmt.Sprintf("sample-%s", id),
			FileName:    sample.FileName,
			Size:        info.Size(),
			Columns:     headers,
			PreviewRows: previewRows,
		})
		return
	}

	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", sample.FileName))
	w.WriteHeader(http.StatusOK)

	if _, err := io.Copy(w, f); err != nil {
		log.Printf("error copying sample file to response: %v", err)
	}
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
	mux.HandleFunc("/api/samples", handleGetSamples)
	mux.HandleFunc("/api/samples/", handleDownloadSample)
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
