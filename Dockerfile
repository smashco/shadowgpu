# Build Stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy generic files
COPY go.mod ./
# COPY go.sum ./ # No dependencies yet, so go.sum might not exist or be needed yet.

# Download dependencies (if any in future)
# RUN go mod download

COPY . .

# Build the binary
# CGO_ENABLED=0 for static binary
RUN CGO_ENABLED=0 GOOS=linux go build -o shadow-agent cmd/agent/main.go

# Run Stage
FROM alpine:3.18

# Install nvidia-smi dependencies or expect them mounted?
# Usually, we rely on the host's nvidia-smi being mounted or accessible.
# However, to facilitate calling it, we might need a basic shell. Alpine has sh.

WORKDIR /root/

COPY --from=builder /app/shadow-agent .

# We expect nvidia-smi to be available in PATH. 
# In K8s, we often mount /usr/bin/nvidia-smi or use NV_DRIVER capabilities.

CMD ["./shadow-agent"]
