#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/create-six-pendulum-runpod-pod.sh [--gpu GPU_ID] [--name NAME]

Creates a RunPod GPU pod for six-pendulum training using the official PyTorch 2.8.0
CUDA 12.8 template. Requires RUNPOD_API_KEY or Doppler api_keys/dev.

Defaults:
  template: runpod-torch-v280
  image:    runpod/pytorch:1.0.2-cu1281-torch280-ubuntu2404
  gpu:      NVIDIA GeForce RTX 4090
  cloud:    COMMUNITY
  disk:     80 GB container, 50 GB volume mounted at /workspace
  stop:     terminate after 6 hours
EOF
}

if [[ -z "${RUNPOD_API_KEY:-}" ]] && command -v doppler >/dev/null 2>&1; then
  exec doppler run --project api_keys --config dev -- "$0" "$@"
fi

NAME="six-pendulum-ppo"
GPU_ID="NVIDIA GeForce RTX 4090"
TEMPLATE_ID="runpod-torch-v280"
CLOUD_TYPE="COMMUNITY"
CONTAINER_DISK_GB=80
VOLUME_GB=50
TERMINATE_AFTER=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name)
      NAME="$2"
      shift 2
      ;;
    --gpu)
      GPU_ID="$2"
      shift 2
      ;;
    --template-id)
      TEMPLATE_ID="$2"
      shift 2
      ;;
    --cloud-type)
      CLOUD_TYPE="$2"
      shift 2
      ;;
    --container-disk-in-gb)
      CONTAINER_DISK_GB="$2"
      shift 2
      ;;
    --volume-in-gb)
      VOLUME_GB="$2"
      shift 2
      ;;
    --terminate-after)
      TERMINATE_AFTER="$2"
      shift 2
      ;;
    --no-auto-terminate)
      TERMINATE_AFTER="none"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "${RUNPOD_API_KEY:-}" ]]; then
  echo "RUNPOD_API_KEY is not set. Add it to Doppler api_keys/dev or export it locally." >&2
  exit 2
fi

if [[ -z "$TERMINATE_AFTER" ]]; then
  TERMINATE_AFTER="$(date -u -v+6H '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -d '+6 hours' '+%Y-%m-%dT%H:%M:%SZ')"
fi

CREATE_ARGS=(
  pod create
  --name "$NAME"
  --template-id "$TEMPLATE_ID"
  --gpu-id "$GPU_ID"
  --cloud-type "$CLOUD_TYPE"
  --container-disk-in-gb "$CONTAINER_DISK_GB"
  --volume-in-gb "$VOLUME_GB"
  --volume-mount-path /workspace
  --ports 22/tcp
)

if [[ "$CLOUD_TYPE" == "COMMUNITY" ]]; then
  CREATE_ARGS+=(--public-ip)
fi

if [[ "$TERMINATE_AFTER" != "none" ]]; then
  CREATE_ARGS+=(--terminate-after "$TERMINATE_AFTER")
fi

runpodctl "${CREATE_ARGS[@]}"
