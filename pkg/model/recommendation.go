package model

type RecommendationSeverity string

const (
	SeverityInfo     RecommendationSeverity = "INFO"
	SeverityWarning  RecommendationSeverity = "WARNING"
	SeverityCritical RecommendationSeverity = "CRITICAL"
)

type Recommendation struct {
	ID          string                 `json:"id"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Action      string                 `json:"action"`
	Severity    RecommendationSeverity `json:"severity"`
	PotentialSavings string            `json:"potential_savings,omitempty"`
}

type AuditReport struct {
	Timestamp       string           `json:"timestamp"`
	Cluster         string           `json:"cluster"`
	Recommendations []Recommendation `json:"recommendations"`
}
