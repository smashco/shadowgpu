package collector

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"time"

	"github.com/shadow-gpu/agent/pkg/model"
)

type GPUCollector struct {
	// Wrapper to allow mocking the command in tests
	CmdExecutor func(name string, args ...string) *exec.Cmd
}

func NewGPUCollector() *GPUCollector {
	return &GPUCollector{
		CmdExecutor: exec.Command,
	}
}

func (c *GPUCollector) Collect() ([]model.MetricSample, error) {
	// Query NVIDIA SMI for CSV output
	// format: uuid, name, utilization.gpu, memory.used, memory.total, power.draw, temperature.gpu
	args := []string{
		"--query-gpu=uuid,name,utilization.gpu,memory.used,memory.total,power.draw,temperature.gpu",
		"--format=csv,noheader,nounits",
	}

	cmd := c.CmdExecutor("nvidia-smi", args...)
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	if err != nil {
		// If nvidia-smi is missing, return empty or error.
		// For now, we return error as this is crucial.
		return nil, fmt.Errorf("failed to run nvidia-smi: %w", err)
	}

	return c.parseSMIOutput(out.String())
}

func (c *GPUCollector) parseSMIOutput(output string) ([]model.MetricSample, error) {
	r := csv.NewReader(strings.NewReader(output))
	records, err := r.ReadAll()
	if err != nil {
		return nil, fmt.Errorf("failed to parse csv: %w", err)
	}

	var results []model.MetricSample
	now := time.Now().UTC()

	for _, row := range records {
		if len(row) < 7 {
			continue
		}

		util, _ := strconv.Atoi(strings.TrimSpace(row[2]))
		memUsed, _ := strconv.Atoi(strings.TrimSpace(row[3]))
		memTotal, _ := strconv.Atoi(strings.TrimSpace(row[4]))
		power, _ := strconv.ParseFloat(strings.TrimSpace(row[5]), 64)
		temp, _ := strconv.Atoi(strings.TrimSpace(row[6]))

		gpu := model.DeviceMetrics{
			UUID:        strings.TrimSpace(row[0]),
			Name:        strings.TrimSpace(row[1]),
			Utilization: util,
			MemoryUsed:  memUsed,
			MemoryTotal: memTotal,
			PowerDraw:   power,
			Temperature: temp,
		}

		results = append(results, model.MetricSample{
			Timestamp: now,
			GPU:       gpu,
			// Metadata to be enriched later or here if we have process info
			Meta: model.ContainerMetadata{},
		})
	}

	return results, nil
}
