package report

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/shadow-gpu/agent/pkg/model"
)

func GenerateAudit(recs []model.Recommendation) error {
	report := model.AuditReport{
		Timestamp:       time.Now().Format(time.RFC3339),
		Cluster:         "local-cluster", // In real app, from metadata
		Recommendations: recs,
	}

	// 1. Write JSON
	data, err := json.MarshalIndent(report, "", "  ")
	if err != nil {
		return err
	}

	err = os.WriteFile("audit_report.json", data, 0644)
	if err != nil {
		return err
	}
    
    // 2. Write Text Summary (Simulating PDF content)
    summary := fmt.Sprintf("SHADOW GPU AUDIT REPORT\nDate: %s\n\n", report.Timestamp)
    if len(recs) == 0 {
        summary += "No inefficiencies detected. Great job!\n"
    } else {
        summary += fmt.Sprintf("Found %d Recommendations:\n\n", len(recs))
        for i, r := range recs {
            summary += fmt.Sprintf("%d. [%s] %s\n   %s\n   Action: %s\n   Savings: %s\n\n", 
                i+1, r.Severity, r.Title, r.Description, r.Action, r.PotentialSavings)
        }
    }
    
    err = os.WriteFile("audit_summary.txt", []byte(summary), 0644)
    if err != nil {
        return err
    }

	return nil
}
