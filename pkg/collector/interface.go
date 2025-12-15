package collector

import "github.com/shadow-gpu/agent/pkg/model"

// Collector indicates a source of metrics
type Collector interface {
	Collect() ([]model.MetricSample, error)
}
