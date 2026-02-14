package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

const maxUploadBytes = 10 << 20 // 10MB

type UploadResponse struct {
	ReportID string `json:"reportId"`
	FileName string `json:"fileName"`
	Size     int64  `json:"size"`
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
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Limit upload size
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadBytes)
	err := r.ParseMultipartForm(maxUploadBytes)
	if err != nil {
		http.Error(w, "File too large or invalid multipart form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Failed to get file from form-data", http.StatusBadRequest)
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
		http.Error(w, "Only .csv files are allowed", http.StatusUnsupportedMediaType)
		return
	}

	reportID := uuid.NewString()
	tempFileName := fmt.Sprintf("%s-%s", reportID, filename)
	tempFilePath := filepath.Join(os.TempDir(), tempFileName)

	dst, err := os.Create(tempFilePath)
	if err != nil {
		http.Error(w, "Failed to create temporary file", http.StatusInternalServerError)
		return
	}
	defer func() {
  	if err := dst.Close(); err != nil {
  		log.Printf("error closing temporary file: %v", err)
  	}
  	}()

	size, err := io.Copy(dst, file)
	if err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusCreated, UploadResponse{
		ReportID: reportID,
		FileName: filename,
		Size:     size,
	})
}

func main() {
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
