package reports

import (
	"log"
	"os"
	"time"
)

func StartCleanupWorker() {
	ticker := time.NewTicker(10 * time.Minute)
	go func() {
		CleanupExpiredReports() // run immediately once
		for range ticker.C {
			CleanupExpiredReports()
		}
	}()
}

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
