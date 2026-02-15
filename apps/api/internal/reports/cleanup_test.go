package reports

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestCleanupExpiredReports(t *testing.T) {
	tmpDir := t.TempDir()
	expiredFile := filepath.Join(tmpDir, "expired.csv")
	if err := os.WriteFile(expiredFile, []byte("id,name\n1,expired"), 0644); err != nil {
		t.Fatal(err)
	}
	validFile := filepath.Join(tmpDir, "valid.csv")
	if err := os.WriteFile(validFile, []byte("id,name\n2,valid"), 0644); err != nil {
		t.Fatal(err)
	}
	ClearStore()
	expiredID := "expired-id"
	SaveReport(Report{ID: expiredID, FilePath: expiredFile, CreatedAt: time.Now().Add(-2 * time.Hour)})
	validID := "valid-id"
	SaveReport(Report{ID: validID, FilePath: validFile, CreatedAt: time.Now()})
	CleanupExpiredReports()
	if _, ok := GetReport(expiredID); ok {
		t.Errorf("expected expired report %s to be removed from store", expiredID)
	}
	if _, err := os.Stat(expiredFile); !os.IsNotExist(err) {
		t.Errorf("expected expired file %s to be deleted", expiredFile)
	}
	if _, ok := GetReport(validID); !ok {
		t.Errorf("expected valid report %s to remain in store", validID)
	}
	if _, err := os.Stat(validFile); err != nil {
		t.Errorf("expected valid file %s to exist, got error: %v", validFile, err)
	}
}
