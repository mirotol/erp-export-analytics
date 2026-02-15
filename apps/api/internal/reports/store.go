package reports

import (
	"sync"
	"time"
)

type Report struct {
	ID        string
	FilePath  string
	CreatedAt time.Time
}

var (
	Store   = make(map[string]Report)
	StoreMu sync.RWMutex
	TTL     = 1 * time.Hour
)

func SetTTL(ttl time.Duration) {
	StoreMu.Lock()
	defer StoreMu.Unlock()
	TTL = ttl
}

func ClearStore() {
	StoreMu.Lock()
	defer StoreMu.Unlock()
	Store = make(map[string]Report)
}

func GetReport(id string) (Report, bool) {
	StoreMu.RLock()
	defer StoreMu.RUnlock()
	report, ok := Store[id]
	return report, ok
}

func SaveReport(report Report) {
	StoreMu.Lock()
	defer StoreMu.Unlock()
	Store[report.ID] = report
}
