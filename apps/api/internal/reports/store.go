package reports

import (
	"sync"
	"time"
)

// Report represents a metadata entry for an uploaded CSV file.
type Report struct {
	ID        string
	FilePath  string
	CreatedAt time.Time
}

var (
	// Store is an in-memory map of report metadata, keyed by report ID.
	Store = make(map[string]Report)
	// StoreMu protects concurrent access to the Store.
	StoreMu sync.RWMutex
	// TTL defines the duration after which an uploaded report is considered expired.
	TTL = 1 * time.Hour
)

// SetTTL updates the global expiration duration for reports.
func SetTTL(ttl time.Duration) {
	StoreMu.Lock()
	defer StoreMu.Unlock()
	TTL = ttl
}

// ClearStore removes all entries from the report store.
func ClearStore() {
	StoreMu.Lock()
	defer StoreMu.Unlock()
	Store = make(map[string]Report)
}

// GetReport retrieves a report by its ID from the store.
func GetReport(id string) (Report, bool) {
	StoreMu.RLock()
	defer StoreMu.RUnlock()
	report, ok := Store[id]
	return report, ok
}

// SaveReport adds or updates a report in the store.
func SaveReport(report Report) {
	StoreMu.Lock()
	defer StoreMu.Unlock()
	Store[report.ID] = report
}
