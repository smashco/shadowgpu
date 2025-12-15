package collector

import (
	"os"

	"github.com/shadow-gpu/agent/pkg/model"
)

type MetadataCollector struct{}

func NewMetadataCollector() *MetadataCollector {
	return &MetadataCollector{}
}

// Collect returns a defined metadata struct.
// In MVP, this is static or basic env vars.
// Real implementation would look up Pod from /var/lib/kubelet/pod-resources or Docker socket.
func (c *MetadataCollector) Collect() (model.ContainerMetadata, error) {
    // Basic fallback: use Hostname as NodeName
    host, _ := os.Hostname()

	return model.ContainerMetadata{
		NodeName: host,
		// In a DaemonSet, we might get POD_NAME and POD_NAMESPACE from Downward API
		PodName:   os.Getenv("POD_NAME"),
		Namespace: os.Getenv("POD_NAMESPACE"),
	}, nil
}
