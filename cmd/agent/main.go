package main

import (
	"encoding/json"
	"log"
	"os"
	"time"

	"github.com/shadow-gpu/agent/pkg/collector"
	"github.com/shadow-gpu/agent/pkg/model"
	"github.com/shadow-gpu/agent/pkg/recommendation"
	"github.com/shadow-gpu/agent/pkg/report"
)

func main() {
	log.Println("Starting Shadow GPU Agent...")

	gpuCol := collector.NewGPUCollector()
	metaCol := collector.NewMetadataCollector()

	// Buffer for analysis window
	var history []model.MetricSample
	recEngine := recommendation.NewEngine()

	// Default poll interval
	interval := 5 * time.Second
	// Analysis interval (every 1 minute for data)
	analysisTicker := time.NewTicker(30 * time.Second) // Fast for demo

	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	defer analysisTicker.Stop()

	log.Printf("Polling every %s, Analysis every 30s", interval)

	for {
		select {
		case <-ticker.C:
			samples := collectAndLog(gpuCol, metaCol)
			history = append(history, samples...)
			// Keep history size manageable (e.g., last 100 samples)
			if len(history) > 100 {
				history = history[len(history)-100:]
			}
		case <-analysisTicker.C:
			log.Println("Running Optimization Analysis...")
			recs := recEngine.Analyze(history)
			if len(recs) > 0 {
				log.Printf("Analysis complete: Found %d recommendations", len(recs))
				report.GenerateAudit(recs)
			} else {
				log.Println("Analysis complete: No issues found.")
			}
		}
	}
}

func collectAndLog(gpuCol *collector.GPUCollector, metaCol *collector.MetadataCollector) []model.MetricSample {
	// 1. Get GPU Metrics
	metrics, err := gpuCol.Collect()
	if err != nil {
		log.Printf("Error collecting GPU metrics: %v", err)
		return nil
	}

	// 2. Get Metadata
	meta, err := metaCol.Collect()
	if err != nil {
		log.Printf("Error collecting metadata: %v", err)
	}

	// 3. Enrich and Print
	enc := json.NewEncoder(os.Stdout)
	var samples []model.MetricSample

	for _, m := range metrics {
		// Enrich locally
		m.Meta = meta
		samples = append(samples, m)
		
		// Ingest/Log
		if err := enc.Encode(m); err != nil {
			log.Printf("Error encoding metric: %v", err)
		}
	}
	return samples
}
