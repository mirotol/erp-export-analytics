package reports

import (
	"log"
	"os"
	"time"
)

// StartCleanupWorker initializes and starts a background goroutine that periodically
// removes expired report files and their metadata from the store.
func StartCleanupWorker() {
	ticker := time.NewTicker(10 * time.Minute)
	go func() {
		CleanupExpiredReports() // run immediately once
		for range ticker.C {
			CleanupExpiredReports()
		}
	}()
}

// CleanupExpiredReports scans the report store for entries older than the configured TTL,
// deletes their corresponding files from disk, and removes them from the store.
func CleanupExpiredReports() {
	StoreMu.Lock()
	defer StoreMu.Unlock()

	now := time.Now()
	for id, report := range Store {
		if now.Sub(report.CreatedAt) > TTL {
			log.Printf("cleaning up expired report: %s (path: %s)", id, report.FilePath)
			if err := os.Remove(report.FilePath); err != nil && !os.IsNotExist(err) {
				log.Printf("error removing expired report file %s: %v", report.FilePath, err)
			}
			delete(Store, id)
		}
	}
}
