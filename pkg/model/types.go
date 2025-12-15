package model

import "time"

// DeviceMetrics represents the raw telemetry from a single GPU
type DeviceMetrics struct {
	UUID        string  `json:"uuid"`
	Name        string  `json:"name"`
	Utilization int     `json:"utilization_gpu"` // Percent
	MemoryUsed  int     `json:"memory_used"`     // MiB
	MemoryTotal int     `json:"memory_total"`    // MiB
	PowerDraw   float64 `json:"power_draw"`      // Watts
	Temperature int     `json:"temperature"`     // Celsius
}

// ContainerMetadata represents the context of where the workload is running
type ContainerMetadata struct {
	PodName       string `json:"pod_name,omitempty"`
	Namespace     string `json:"namespace,omitempty"`
	ContainerName string `json:"container_name,omitempty"`
	NodeName      string `json:"node_name,omitempty"`
}

// MetricSample combines infrastructure and telemetry data
type MetricSample struct {
	Timestamp time.Time         `json:"timestamp"`
	GPU       DeviceMetrics     `json:"gpu"`
	Meta      ContainerMetadata `json:"meta"`
}
