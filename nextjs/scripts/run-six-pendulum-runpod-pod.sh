#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/run-six-pendulum-runpod-pod.sh --pod-id POD_ID [runner args...]

Reads RunPod SSH connection info for a pod, extracts host and port, then runs the
provider-neutral six-pendulum remote GPU trainer.

Examples:
  scripts/run-six-pendulum-runpod-pod.sh --pod-id abc123 --warmstart-checkpoint /path/policy.pt
  scripts/run-six-pendulum-runpod-pod.sh --pod-id abc123 -- --command 'npm run ...'
EOF
}

if [[ -z "${RUNPOD_API_KEY:-}" ]] && command -v doppler >/dev/null 2>&1; then
  exec doppler run --project api_keys --config dev -- "$0" "$@"
fi

POD_ID=""
RUNNER_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --pod-id)
      POD_ID="$2"
      shift 2
      ;;
    --)
      shift
      RUNNER_ARGS+=("$@")
      break
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      RUNNER_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ -z "$POD_ID" ]]; then
  echo "Missing --pod-id" >&2
  usage >&2
  exit 2
fi

if [[ -z "${RUNPOD_API_KEY:-}" ]]; then
  echo "RUNPOD_API_KEY is not set. Add it to Doppler api_keys/dev or export it locally." >&2
  exit 2
fi

INFO="$(runpodctl ssh info "$POD_ID" --verbose --output json)"

PARSED="$(
  INFO_JSON="$INFO" node - <<'NODE'
const raw = process.env.INFO_JSON || '';
function collectStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const item of value) collectStrings(item, out);
  else if (value && typeof value === 'object') for (const item of Object.values(value)) collectStrings(item, out);
  return out;
}
let candidates = [raw];
try {
  candidates = collectStrings(JSON.parse(raw));
} catch {}
const command = candidates.find((s) => /\bssh\b/.test(s) && /@/.test(s)) || candidates.find((s) => /@/.test(s)) || raw;
const hostMatch = command.match(/(?:^|\s)([A-Za-z0-9._-]+@[A-Za-z0-9._-]+)(?:\s|$)/);
const portMatch = command.match(/(?:^|\s)-p\s+([0-9]+)/) || command.match(/(?:^|\s)-p([0-9]+)/);
const identityMatch = command.match(/(?:^|\s)-i\s+(\S+)/);
if (!hostMatch) {
  console.error(`Could not parse SSH host from runpodctl output:\n${raw}`);
  process.exit(1);
}
const lines = [`HOST=${JSON.stringify(hostMatch[1])}`];
if (portMatch) lines.push(`SSH_PORT=${JSON.stringify(portMatch[1])}`);
if (identityMatch) lines.push(`IDENTITY_FILE=${JSON.stringify(identityMatch[1])}`);
console.log(lines.join('\n'));
NODE
)"

HOST=""
SSH_PORT=""
IDENTITY_FILE=""
while IFS='=' read -r key value; do
  case "$key" in
    HOST) HOST="$(node -e "console.log(JSON.parse(process.argv[1]))" "$value")" ;;
    SSH_PORT) SSH_PORT="$(node -e "console.log(JSON.parse(process.argv[1]))" "$value")" ;;
    IDENTITY_FILE) IDENTITY_FILE="$(node -e "console.log(JSON.parse(process.argv[1]))" "$value")" ;;
  esac
done <<< "$PARSED"

COMMAND=(scripts/run-six-pendulum-remote-gpu.sh --host "$HOST" --ssh-option StrictHostKeyChecking=accept-new)
if [[ -n "$SSH_PORT" ]]; then
  COMMAND+=(--ssh-port "$SSH_PORT")
fi
if [[ -n "$IDENTITY_FILE" ]]; then
  COMMAND+=(--identity-file "$IDENTITY_FILE")
fi
COMMAND+=("${RUNNER_ARGS[@]}")

exec "${COMMAND[@]}"
