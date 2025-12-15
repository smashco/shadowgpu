package recommendation

import (
	"fmt"
	"github.com/shadow-gpu/agent/pkg/model"
)

type Engine struct {
	// Configuration for thresholds
	IdleThresholdPercent int
	IdleTimeThreshold    int // number of samples
}

func NewEngine() *Engine {
	return &Engine{
		IdleThresholdPercent: 5,
		IdleTimeThreshold:    5, // Assuming 5 samples * 5s = 25s for MVP
	}
}

// Analyze processes a window of metrics and returns recommendations
func (e *Engine) Analyze(history []model.MetricSample) []model.Recommendation {
	var recs []model.Recommendation

	// Group by GPU UUID
	gpuHistory := make(map[string][]model.MetricSample)
	for _, s := range history {
		gpuHistory[s.GPU.UUID] = append(gpuHistory[s.GPU.UUID], s)
	}

	for uuid, samples := range gpuHistory {
		if r := e.checkIdle(uuid, samples); r != nil {
			recs = append(recs, *r)
		}
		if r := e.checkLowBatchSize(uuid, samples); r != nil {
			recs = append(recs, *r)
		}
		// AMP check would require more sophisticated model introspection (e.g. kernel names)
		// For MVP, we'll use a heuristic: High memory, low-ish util? Actually hard without DCGM profiling.
		// We'll add a placeholder based on "High FP32 Usage" if we had that metric.
		// Let's implement a "Check Mixed Precision" heuristic based on static model assumptions if we had them,
		// or just generic "High Memory, Low Util" might suggest bin packing.
		
		// Let's do the "High Memory + Low Util" -> Bin Packing recommendation
		if r := e.checkBinPacking(uuid, samples); r != nil {
			recs = append(recs, *r)
		}
	}

	return recs
}

func (e *Engine) checkIdle(uuid string, samples []model.MetricSample) *model.Recommendation {
	if len(samples) < e.IdleTimeThreshold {
		return nil
	}

	// Check if all recent samples are idle
	isIdle := true
	for _, s := range samples[len(samples)-e.IdleTimeThreshold:] {
		if s.GPU.Utilization > e.IdleThresholdPercent {
			isIdle = false
			break
		}
	}

	if isIdle {
		return &model.Recommendation{
			ID:          "IDLE_GPU_" + uuid,
			Title:       "Idle GPU Detected",
			Description: fmt.Sprintf("GPU %s has been under %d%% utilization for the last %d samples.", uuid, e.IdleThresholdPercent, e.IdleTimeThreshold),
			Action:      "Downscale instance or re-schedule jobs.",
			Severity:    model.SeverityCritical,
			PotentialSavings: "$$$",
		}
	}
	return nil
}

func (e *Engine) checkLowBatchSize(uuid string, samples []model.MetricSample) *model.Recommendation {
	// Heuristic: High Volatility in Util (spiky) often means small batch size (kernel launch overhead).
	// OR: Low Util + Low Memory Util.
	
	avgUtil := 0
	avgMem := 0
	count := 0
	
	for _, s := range samples {
		avgUtil += s.GPU.Utilization
		avgMem += s.GPU.MemoryUsed // absolute
		count++
	}
	avgUtil /= count
	avgMem /= count
	
	// If Util is low (e.g. 30%) but Memory is also low, it's just underutilized.
	// If Util is low (30%) but Memory is High (90%), it involves heavy data but slow compute? No.
	// Low Batch Size usually: Low Util, Low Memory.
	
	if avgUtil > 10 && avgUtil < 40 {
		return &model.Recommendation{
			ID:          "LOW_BATCH_" + uuid,
			Title:       "Low Batch Size Suspected",
			Description: "GPU utilization is consistently low (10-40%).",
			Action:      "Increase batch size to saturate GPU compute.",
			Severity:    model.SeverityWarning,
			PotentialSavings: "2x Throughput",
		}
	}
	return nil
}

func (e *Engine) checkBinPacking(uuid string, samples []model.MetricSample) *model.Recommendation {
    // If we simply have low util and low mem, we can suggest MIG or bin packing.
    last := samples[len(samples)-1]
    memPct := (float64(last.GPU.MemoryUsed) / float64(last.GPU.MemoryTotal)) * 100
    
    if last.GPU.Utilization < 30 && memPct < 40 {
        return &model.Recommendation{
            ID: "BIN_PACK_" + uuid,
            Title: "Opportunity for Bin Packing",
            Description: "GPU has spare compute and memory capacity.",
            Action: "Consolidate workloads or use NVIDIA MIG.",
            Severity: model.SeverityInfo,
            PotentialSavings: "50% Cost",
        }
    }
    return nil
}
